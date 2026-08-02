import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DataScope } from '../domain/data-scope';
import { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import { MembershipEntity } from '../infrastructure/membership.entity';
import { RoleEntity } from '../infrastructure/role.entity';
import { UserRoleEntity } from '../infrastructure/user-role.entity';

const crossDepartmentLegacyRoles = new Set([
  'FINANCE_REVIEWER',
  'OFFICE_REVIEWER',
  'SEAL_MANAGER',
  'PROCUREMENT',
  'WAREHOUSE_MANAGER',
  'ADMIN_APPROVER',
  'BUSINESS_APPROVER',
  'CATERING_APPROVER',
  'EXEC_PRE_APPROVER',
  'EXEC_APPROVER',
]);

interface LegacyRoleScope {
  dataScope: DataScope;
  scopeDepartmentId: string | null;
}

/** Idempotent compatibility bridge for databases created before the IAM module existed. */
@Injectable()
export class LegacyIamBootstrapService {
  private initialized = false;

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departments: Repository<DepartmentEntity>,
    @InjectRepository(DepartmentProfileEntity)
    private readonly profiles: Repository<DepartmentProfileEntity>,
    @InjectRepository(MembershipEntity)
    private readonly memberships: Repository<MembershipEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoles: Repository<UserRoleEntity>,
  ) {}

  async ensureInitialized(force = false): Promise<void> {
    if (this.initialized && !force) return;
    const [departments, users] = await Promise.all([this.departments.find(), this.users.find()]);
    // AuthService seeds development identities in the same lifecycle; retry lazily if it ran later.
    await this.ensureDepartmentProfiles(departments);
    if (users.length === 0) return;
    await this.migrateLegacyUsers(users);
    await this.ensureConfiguredAdministrator(users);
    this.initialized = true;
  }

  private async ensureDepartmentProfiles(departments: DepartmentEntity[]): Promise<void> {
    const existing = new Set((await this.profiles.find()).map((profile) => profile.departmentId));
    const missing = departments
      .filter((department) => !existing.has(department.id))
      .map((department) => ({
        departmentId: department.id,
        parentDepartmentId: null,
        sortOrder: 0,
        active: true,
      }));
    if (missing.length > 0) await this.profiles.insert(missing);
  }

  private async migrateLegacyUsers(users: UserEntity[]): Promise<void> {
    await this.memberships.manager.transaction(async (manager) => {
      const membershipRepository = manager.getRepository(MembershipEntity);
      const existingMemberships = await membershipRepository.find();
      // Memberships survive complete role revocation and form the one-time migration boundary.
      const iamUserIds = new Set(existingMemberships.map((membership) => membership.userId));
      const legacyUsers = users.filter((user) => !iamUserIds.has(user.id));
      if (legacyUsers.length === 0) return;

      await this.ensureLegacyMemberships(membershipRepository, legacyUsers);
      await this.ensureLegacyRoles(
        manager.getRepository(RoleEntity),
        manager.getRepository(UserRoleEntity),
        legacyUsers,
      );
    });
  }

  private async ensureLegacyMemberships(
    repository: Repository<MembershipEntity>,
    users: UserEntity[],
  ): Promise<void> {
    const missing = users.map((user) => ({
      id: randomUUID(),
      userId: user.id,
      departmentId: user.departmentId,
      positionId: null,
      isPrimary: true,
      isDepartmentHead: false,
      active: true,
    }));
    await repository.insert(missing);
  }

  private async ensureLegacyRoles(
    roleRepository: Repository<RoleEntity>,
    userRoleRepository: Repository<UserRoleEntity>,
    users: UserEntity[],
  ): Promise<void> {
    const roleByCode = new Map((await roleRepository.find()).map((role) => [role.code, role]));
    for (const code of new Set(users.flatMap((user) => user.roleCodes))) {
      if (roleByCode.has(code)) continue;
      const role = await roleRepository.save({
        id: randomUUID(),
        code,
        name: code,
        description: '从旧版身份数据迁移',
        active: true,
      });
      roleByCode.set(code, role);
    }

    const missing: UserRoleEntity[] = [];
    for (const user of users) {
      for (const code of user.roleCodes) {
        const role = roleByCode.get(code);
        if (!role) continue;
        const scope = resolveLegacyRoleScope(code, user.departmentId);
        missing.push({
          id: randomUUID(),
          userId: user.id,
          roleId: role.id,
          ...scope,
        });
      }
    }
    if (missing.length > 0) await userRoleRepository.insert(missing);
  }

  private async ensureConfiguredAdministrator(users: UserEntity[]): Promise<void> {
    const username = process.env.OA_BOOTSTRAP_ADMIN_USERNAME?.trim();
    if (!username) return;
    const user = users.find((candidate) => candidate.username === username && candidate.active);
    if (!user) throw new Error(`OA_BOOTSTRAP_ADMIN_USERNAME 指定的启用用户不存在: ${username}`);
    const role = await this.roles.findOneBy({ code: 'SYSTEM_ADMIN', active: true });
    if (!role) throw new Error('SYSTEM_ADMIN 角色未初始化，请检查 IAM 迁移');

    const existing = await this.userRoles.findBy({ userId: user.id, roleId: role.id });
    if (
      existing.length === 1 &&
      existing[0]?.dataScope === DataScope.ALL &&
      existing[0].scopeDepartmentId === null
    ) {
      return;
    }
    // Explicit bootstrap configuration owns this system role and normalizes it to global scope.
    await this.userRoles.delete({ userId: user.id, roleId: role.id });
    await this.userRoles.insert({
      id: randomUUID(),
      userId: user.id,
      roleId: role.id,
      dataScope: DataScope.ALL,
      scopeDepartmentId: null,
    });
  }
}

/**
 * Maps legacy single-department roles to an operational initial scope.
 * Administrators can narrow or widen these grants after the compatibility migration.
 */
export function resolveLegacyRoleScope(roleCode: string, departmentId: string): LegacyRoleScope {
  if (roleCode === 'APPLICANT' || roleCode === 'INITIATOR') {
    return { dataScope: DataScope.SELF, scopeDepartmentId: null };
  }
  if (crossDepartmentLegacyRoles.has(roleCode)) {
    return { dataScope: DataScope.ALL, scopeDepartmentId: null };
  }
  return { dataScope: DataScope.DEPARTMENT, scopeDepartmentId: departmentId };
}
