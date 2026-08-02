import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import { MembershipEntity } from '../infrastructure/membership.entity';
import { PermissionEntity } from '../infrastructure/permission.entity';
import { PositionEntity } from '../infrastructure/position.entity';
import { RolePermissionEntity } from '../infrastructure/role-permission.entity';
import { RoleEntity } from '../infrastructure/role.entity';
import { UserRoleEntity } from '../infrastructure/user-role.entity';
import { mapUserSummaries } from './iam-read-model';
import type { IamSessionProfile } from './iam.models';

/** Builds one authenticated user's IAM profile without loading organization-wide tables. */
@Injectable()
export class IamSessionProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departments: Repository<DepartmentEntity>,
    @InjectRepository(DepartmentProfileEntity)
    private readonly departmentProfiles: Repository<DepartmentProfileEntity>,
    @InjectRepository(PositionEntity)
    private readonly positions: Repository<PositionEntity>,
    @InjectRepository(MembershipEntity)
    private readonly memberships: Repository<MembershipEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoles: Repository<UserRoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissions: Repository<RolePermissionEntity>,
  ) {}

  async getSessionProfile(userId: string): Promise<IamSessionProfile> {
    const user = await this.users.findOneBy({ id: userId, active: true });
    if (!user) throw new NotFoundException('用户不存在或已停用');

    const [memberships, assignments] = await Promise.all([
      this.memberships.findBy({ userId }),
      this.userRoles.findBy({ userId }),
    ]);
    const roleIds = unique(assignments.map((assignment) => assignment.roleId));
    const departmentIds = unique(memberships.map((membership) => membership.departmentId));
    const positionIds = unique(
      memberships
        .map((membership) => membership.positionId)
        .filter((id): id is string => id !== null),
    );
    const profileDepartmentIds = unique([
      ...departmentIds,
      ...assignments
        .map((assignment) => assignment.scopeDepartmentId)
        .filter((id): id is string => id !== null),
    ]);

    const [roles, departments, positions, profiles] = await Promise.all([
      roleIds.length > 0 ? this.roles.findBy({ id: In(roleIds), active: true }) : [],
      departmentIds.length > 0 ? this.departments.findBy({ id: In(departmentIds) }) : [],
      positionIds.length > 0 ? this.positions.findBy({ id: In(positionIds) }) : [],
      profileDepartmentIds.length > 0
        ? this.departmentProfiles.findBy({ departmentId: In(profileDepartmentIds) })
        : [],
    ]);
    const activeRoleIds = roles.map((role) => role.id);
    const rolePermissions =
      activeRoleIds.length > 0
        ? await this.rolePermissions.findBy({ roleId: In(activeRoleIds) })
        : [];
    const permissionIds = unique(rolePermissions.map((link) => link.permissionId));
    const permissions =
      permissionIds.length > 0
        ? await this.permissions.findBy({ id: In(permissionIds), active: true })
        : [];

    const [summary] = mapUserSummaries({
      users: [user],
      departments,
      positions,
      memberships,
      roles,
      userRoles: assignments,
    });
    if (!summary) throw new NotFoundException('用户不存在或已停用');

    const roleById = new Map(roles.map((role) => [role.id, role]));
    const permissionById = new Map(permissions.map((permission) => [permission.id, permission]));
    const permissionCodesByRole = new Map<string, string[]>();
    for (const link of rolePermissions) {
      const code = permissionById.get(link.permissionId)?.code;
      if (!code) continue;
      permissionCodesByRole.set(link.roleId, [
        ...(permissionCodesByRole.get(link.roleId) ?? []),
        code,
      ]);
    }

    const inactiveDepartmentIds = new Set(
      profiles.filter((profile) => !profile.active).map((profile) => profile.departmentId),
    );
    const dataScopes = assignments
      .filter(
        (assignment) =>
          !assignment.scopeDepartmentId || !inactiveDepartmentIds.has(assignment.scopeDepartmentId),
      )
      .map((assignment) => {
        const role = roleById.get(assignment.roleId);
        if (!role) return null;
        return {
          roleCode: role.code,
          permissionCodes: unique(permissionCodesByRole.get(role.id) ?? []).sort(),
          scope: assignment.dataScope,
          scopeDepartmentId: assignment.scopeDepartmentId,
        };
      })
      .filter((grant): grant is NonNullable<typeof grant> => grant !== null);

    return {
      userId,
      roleCodes: unique(dataScopes.map((grant) => grant.roleCode)).sort(),
      permissionCodes: unique(dataScopes.flatMap((grant) => grant.permissionCodes)).sort(),
      memberships: summary.memberships.filter(
        (membership) => membership.active && !inactiveDepartmentIds.has(membership.departmentId),
      ),
      dataScopes,
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
