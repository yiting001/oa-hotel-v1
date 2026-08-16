import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'argon2';
import { randomUUID } from 'node:crypto';
import { DataSource, type EntityManager, In, QueryFailedError, Repository } from 'typeorm';
import { credentialPolicy } from '../../auth/credential-policy';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DomainError } from '../../errors/domain-error';
import { DataScope } from '../domain/data-scope';
import { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import { MembershipEntity } from '../infrastructure/membership.entity';
import { PermissionEntity } from '../infrastructure/permission.entity';
import { PositionEntity } from '../infrastructure/position.entity';
import { RolePermissionEntity } from '../infrastructure/role-permission.entity';
import { RoleEntity } from '../infrastructure/role.entity';
import { UserRoleEntity } from '../infrastructure/user-role.entity';
import type {
  CandidateUser,
  MembershipWriteInput,
  RoleAssignmentWriteInput,
  RoleSummary,
  UserAccessSummary,
  UserAssignmentsWriteInput,
  UserCreateInput,
  UserUpdateInput,
} from './iam.models';
import { mapRoleSummaries, mapUserSummaries } from './iam-read-model';
import { collectDepartmentDescendants } from './organization-tree';

@Injectable()
export class IamAccessService {
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
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async listPermissions(): Promise<PermissionEntity[]> {
    return this.permissions.find({ order: { module: 'ASC', name: 'ASC' } });
  }

  async listRoles(): Promise<RoleSummary[]> {
    const [roles, permissions, rolePermissions] = await Promise.all([
      this.roles.find({ order: { name: 'ASC' } }),
      this.permissions.find(),
      this.rolePermissions.find(),
    ]);
    return mapRoleSummaries(roles, permissions, rolePermissions);
  }

  async listUsers(): Promise<UserAccessSummary[]> {
    const [users, departments, positions, memberships, roles, userRoles] = await Promise.all([
      this.users.find({ order: { displayName: 'ASC' } }),
      this.departments.find(),
      this.positions.find(),
      this.memberships.find(),
      this.roles.find(),
      this.userRoles.find(),
    ]);
    return mapUserSummaries({ users, departments, positions, memberships, roles, userRoles });
  }

  async createUser(input: UserCreateInput): Promise<UserAccessSummary> {
    const username = input.username.trim();
    const displayName = input.displayName.trim();
    if (!username) throw new BadRequestException('登录账号不能为空');
    if (!displayName) throw new BadRequestException('用户姓名不能为空');
    this.assertPasswordPolicy(input.password);
    if (await this.users.exist({ where: { username } })) {
      throw new ConflictException('登录账号已存在');
    }
    this.assertMembershipShape(input.memberships);
    await this.assertMembershipReferences(input.memberships);
    await this.assertRoleReferences(input.roles);

    const userId = randomUUID();
    const primaryDepartmentId =
      input.memberships.find((membership) => membership.isPrimary ?? false)?.departmentId ??
      input.memberships[0]?.departmentId;
    if (!primaryDepartmentId) throw new BadRequestException('用户至少需要一个部门任职');
    const passwordHash = await hash(input.password);

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(UserEntity).insert({
        id: userId,
        username,
        displayName,
        passwordHash,
        departmentId: primaryDepartmentId,
        roleCodes: [],
        active: true,
        passwordChangeRequired: true,
        passwordChangedAt: null,
        credentialVersion: 0,
      });
      await manager.getRepository(MembershipEntity).insert(
        input.memberships.map((membership) => ({
          id: randomUUID(),
          userId,
          departmentId: membership.departmentId,
          positionId: membership.positionId ?? null,
          isPrimary: membership.isPrimary ?? false,
          isDepartmentHead: membership.isDepartmentHead ?? false,
          active: membership.active ?? true,
        })),
      );
      if (input.roles.length > 0) {
        await manager.getRepository(UserRoleEntity).insert(
          input.roles.map((assignment) => ({
            id: randomUUID(),
            userId,
            roleId: assignment.roleId,
            dataScope: assignment.dataScope,
            scopeDepartmentId: assignment.scopeDepartmentId ?? null,
          })),
        );
      }
    });
    return this.getUser(userId);
  }

  async updateUser(userId: string, input: UserUpdateInput): Promise<UserAccessSummary> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');
    if (input.displayName !== undefined) {
      const displayName = input.displayName.trim();
      if (!displayName) throw new BadRequestException('用户姓名不能为空');
      user.displayName = displayName;
    }
    if (input.active !== undefined) {
      if (user.active && !input.active) await this.assertNotLastActiveSystemAdmin(userId);
      user.active = input.active;
    }
    await this.users.save(user);
    return this.getUser(userId);
  }

  async deleteUser(userId: string, actorUserId: string): Promise<void> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');
    if (userId === actorUserId) {
      throw new DomainError('CANNOT_DELETE_CURRENT_USER', '不能删除当前登录的账号');
    }
    if (user.active) await this.assertNotLastActiveSystemAdmin(userId);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(MembershipEntity).delete({ userId });
        await manager.getRepository(UserRoleEntity).delete({ userId });
        await manager.getRepository(UserEntity).delete({ id: userId });
      });
    } catch (cause) {
      if (cause instanceof QueryFailedError && /foreign key/i.test(cause.message)) {
        throw new DomainError(
          'USER_HAS_BUSINESS_DATA',
          '该账号存在关联业务数据，无法删除，请改为停用',
        );
      }
      throw cause;
    }
  }

  async resetUserPassword(userId: string, password: string): Promise<void> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('用户不存在');
    this.assertPasswordPolicy(password);
    await this.users.update(
      { id: userId },
      {
        passwordHash: await hash(password),
        passwordChangeRequired: true,
        passwordChangedAt: new Date(),
        credentialVersion: (user.credentialVersion ?? 0) + 1,
      },
    );
  }

  async replaceUserAssignments(
    userId: string,
    input: UserAssignmentsWriteInput,
  ): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    this.assertMembershipShape(input.memberships);
    await this.assertMembershipReferences(input.memberships);
    await this.assertRoleReferences(input.roles);

    await this.dataSource.transaction(async (manager) => {
      await this.assertLastSystemAdministrator(manager, userId, input.roles);
      await manager.getRepository(MembershipEntity).delete({ userId });
      await manager.getRepository(UserRoleEntity).delete({ userId });
      await manager.getRepository(MembershipEntity).insert(
        input.memberships.map((membership) => ({
          id: randomUUID(),
          userId,
          departmentId: membership.departmentId,
          positionId: membership.positionId ?? null,
          isPrimary: membership.isPrimary ?? false,
          isDepartmentHead: membership.isDepartmentHead ?? false,
          active: membership.active ?? true,
        })),
      );
      if (input.roles.length > 0) {
        await manager.getRepository(UserRoleEntity).insert(
          input.roles.map((assignment) => ({
            id: randomUUID(),
            userId,
            roleId: assignment.roleId,
            dataScope: assignment.dataScope,
            scopeDepartmentId: assignment.scopeDepartmentId ?? null,
          })),
        );
      }
    });
    return this.getUser(userId);
  }

  async resolveCandidateUsers(roleCode: string, departmentId: string): Promise<CandidateUser[]> {
    const [role, targetDepartment] = await Promise.all([
      this.roles.findOneBy({ code: roleCode, active: true }),
      this.departments.findOneBy({ id: departmentId }),
    ]);
    if (!role) throw new NotFoundException('候选人角色不存在或已停用');
    if (!targetDepartment) throw new NotFoundException('目标部门不存在');

    const [assignments, memberships, profiles] = await Promise.all([
      this.userRoles.findBy({ roleId: role.id }),
      this.memberships.findBy({ active: true }),
      this.departmentProfiles.find(),
    ]);
    if (profiles.some((profile) => profile.departmentId === departmentId && !profile.active)) {
      throw new NotFoundException('目标部门已停用');
    }
    const departmentsByUser = new Map<string, Set<string>>();
    for (const membership of memberships) {
      const departmentIds = departmentsByUser.get(membership.userId) ?? new Set<string>();
      departmentIds.add(membership.departmentId);
      departmentsByUser.set(membership.userId, departmentIds);
    }
    const treeCache = new Map<string, Set<string>>();
    const candidateIds = assignments
      .filter((assignment) =>
        this.assignmentCoversDepartment(
          assignment,
          departmentId,
          departmentsByUser,
          profiles,
          treeCache,
        ),
      )
      .map((assignment) => assignment.userId);
    if (candidateIds.length === 0) return [];

    const users = await this.users.find({
      where: { id: In([...new Set(candidateIds)]), active: true },
      order: { displayName: 'ASC' },
    });
    return users.map(({ id, username, displayName }) => ({ id, username, displayName }));
  }

  /** Keeps active candidates whose every required permission covers the target resource. */
  async filterCandidateUsersByPermissions(
    candidates: CandidateUser[],
    permissionCodes: string[],
    departmentId: string,
    ownerUserId: string,
  ): Promise<CandidateUser[]> {
    const uniqueCandidates = [
      ...new Map(candidates.map((candidate) => [candidate.id, candidate])).values(),
    ];
    if (uniqueCandidates.length === 0) return [];

    const requiredCodes = [...new Set(permissionCodes)];
    if (requiredCodes.length === 0) return uniqueCandidates;
    const permissions = await this.permissions.findBy({ code: In(requiredCodes), active: true });
    if (permissions.length !== requiredCodes.length) return [];
    const permissionLinks = await this.rolePermissions.findBy({
      permissionId: In(permissions.map((permission) => permission.id)),
    });
    if (permissionLinks.length === 0) return [];

    const activeRoles = await this.roles.findBy({
      id: In(permissionLinks.map((link) => link.roleId)),
      active: true,
    });
    if (activeRoles.length === 0) return [];

    const candidateIds = uniqueCandidates.map((candidate) => candidate.id);
    const [assignments, memberships, profiles, activeUsers] = await Promise.all([
      this.userRoles.findBy({
        userId: In(candidateIds),
        roleId: In(activeRoles.map((role) => role.id)),
      }),
      this.memberships.findBy({ userId: In(candidateIds), active: true }),
      this.departmentProfiles.find(),
      this.users.findBy({ id: In(candidateIds), active: true }),
    ]);
    const departmentsByUser = new Map<string, Set<string>>();
    for (const membership of memberships) {
      const departmentIds = departmentsByUser.get(membership.userId) ?? new Set<string>();
      departmentIds.add(membership.departmentId);
      departmentsByUser.set(membership.userId, departmentIds);
    }
    const treeCache = new Map<string, Set<string>>();
    const roleIdsByPermissionCode = new Map<string, Set<string>>();
    const permissionCodeById = new Map(
      permissions.map((permission) => [permission.id, permission.code]),
    );
    for (const link of permissionLinks) {
      const permissionCode = permissionCodeById.get(link.permissionId);
      if (!permissionCode) continue;
      const roleIds = roleIdsByPermissionCode.get(permissionCode) ?? new Set<string>();
      roleIds.add(link.roleId);
      roleIdsByPermissionCode.set(permissionCode, roleIds);
    }
    const assignmentsByUser = new Map<string, UserRoleEntity[]>();
    for (const assignment of assignments) {
      const userAssignments = assignmentsByUser.get(assignment.userId) ?? [];
      userAssignments.push(assignment);
      assignmentsByUser.set(assignment.userId, userAssignments);
    }
    const activeUserIds = new Set(activeUsers.map((user) => user.id));
    return uniqueCandidates.filter((candidate) => {
      if (!activeUserIds.has(candidate.id)) return false;
      const userAssignments = assignmentsByUser.get(candidate.id) ?? [];
      return requiredCodes.every((permissionCode) => {
        const roleIds = roleIdsByPermissionCode.get(permissionCode);
        return userAssignments.some(
          (assignment) =>
            roleIds?.has(assignment.roleId) === true &&
            this.assignmentCoversDepartment(
              assignment,
              departmentId,
              departmentsByUser,
              profiles,
              treeCache,
              ownerUserId,
            ),
        );
      });
    });
  }

  private assignmentCoversDepartment(
    assignment: UserRoleEntity,
    departmentId: string,
    departmentsByUser: Map<string, Set<string>>,
    profiles: DepartmentProfileEntity[],
    treeCache: Map<string, Set<string>>,
    ownerUserId?: string,
  ): boolean {
    if (assignment.dataScope === DataScope.ALL) return true;
    if (assignment.dataScope === DataScope.SELF) {
      return ownerUserId === undefined
        ? (departmentsByUser.get(assignment.userId)?.has(departmentId) ?? false)
        : assignment.userId === ownerUserId;
    }
    if (!assignment.scopeDepartmentId) return false;
    if (
      profiles.some(
        (profile) => profile.departmentId === assignment.scopeDepartmentId && !profile.active,
      )
    ) {
      return false;
    }
    if (assignment.dataScope === DataScope.DEPARTMENT) {
      return assignment.scopeDepartmentId === departmentId;
    }
    let descendants = treeCache.get(assignment.scopeDepartmentId);
    if (!descendants) {
      descendants = collectDepartmentDescendants(assignment.scopeDepartmentId, profiles);
      treeCache.set(assignment.scopeDepartmentId, descendants);
    }
    return descendants.has(departmentId);
  }

  private async getUser(userId: string): Promise<UserAccessSummary> {
    const result = (await this.listUsers()).find((user) => user.id === userId);
    if (!result) throw new NotFoundException('用户不存在');
    return result;
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.users.exist({ where: { id: userId } }))) {
      throw new NotFoundException('用户不存在');
    }
  }

  private assertPasswordPolicy(password: string): void {
    if (!/\S/u.test(password)) throw new BadRequestException('密码不能全部为空白字符');
    if (
      password.length < credentialPolicy.newPasswordMinLength ||
      password.length > credentialPolicy.newPasswordMaxLength
    ) {
      throw new BadRequestException(
        `密码长度必须在 ${credentialPolicy.newPasswordMinLength} 至 ${credentialPolicy.newPasswordMaxLength} 位之间`,
      );
    }
  }

  private async assertNotLastActiveSystemAdmin(userId: string): Promise<void> {
    const systemRole = await this.roles.findOneBy({ code: 'SYSTEM_ADMIN', active: true });
    if (!systemRole) return;
    const hasSystemRole = await this.userRoles.exist({
      where: { userId, roleId: systemRole.id },
    });
    if (!hasSystemRole) return;
    const assignments = await this.userRoles.findBy({ roleId: systemRole.id });
    const otherUserIds = [
      ...new Set(assignments.map((item) => item.userId).filter((id) => id !== userId)),
    ];
    const activeAdministratorCount =
      otherUserIds.length === 0
        ? 0
        : await this.users.countBy({ id: In(otherUserIds), active: true });
    if (activeAdministratorCount === 0) {
      throw new DomainError('LAST_SYSTEM_ADMIN_REQUIRED', '不能停用最后一个启用的系统管理员用户');
    }
  }

  private assertMembershipShape(memberships: MembershipWriteInput[]): void {
    const primaryCount = memberships.filter(
      (membership) => (membership.active ?? true) && (membership.isPrimary ?? false),
    ).length;
    if (primaryCount !== 1) throw new BadRequestException('用户必须且只能有一个启用的主部门');

    const keys = memberships.map(
      (membership) => `${membership.departmentId}:${membership.positionId ?? ''}`,
    );
    if (new Set(keys).size !== keys.length) throw new BadRequestException('用户岗位关系不能重复');
  }

  private async assertMembershipReferences(memberships: MembershipWriteInput[]): Promise<void> {
    const departmentIds = [...new Set(memberships.map((item) => item.departmentId))];
    const positionIds = [
      ...new Set(
        memberships
          .map((item) => item.positionId)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];
    const [departments, profiles, positions] = await Promise.all([
      this.departments.findBy({ id: In(departmentIds) }),
      this.departmentProfiles.findBy({ departmentId: In(departmentIds) }),
      positionIds.length > 0 ? this.positions.findBy({ id: In(positionIds), active: true }) : [],
    ]);
    const inactiveDepartments = new Set(
      profiles.filter((profile) => !profile.active).map((profile) => profile.departmentId),
    );
    if (
      departments.length !== departmentIds.length ||
      departmentIds.some((id) => inactiveDepartments.has(id))
    ) {
      throw new BadRequestException('包含不存在或已停用的部门');
    }
    if (positions.length !== positionIds.length)
      throw new BadRequestException('包含不存在或已停用的岗位');

    const positionById = new Map(positions.map((position) => [position.id, position]));
    for (const membership of memberships) {
      if (!membership.positionId) continue;
      const position = positionById.get(membership.positionId);
      if (position?.departmentId && position.departmentId !== membership.departmentId) {
        throw new BadRequestException('岗位与用户所属部门不匹配');
      }
    }
  }

  private async assertRoleReferences(assignments: RoleAssignmentWriteInput[]): Promise<void> {
    const roleIds = [...new Set(assignments.map((item) => item.roleId))];
    const scopeDepartmentIds = [
      ...new Set(
        assignments
          .map((item) => item.scopeDepartmentId)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];
    const [roles, departments, profiles] = await Promise.all([
      roleIds.length > 0 ? this.roles.findBy({ id: In(roleIds), active: true }) : [],
      scopeDepartmentIds.length > 0 ? this.departments.findBy({ id: In(scopeDepartmentIds) }) : [],
      scopeDepartmentIds.length > 0
        ? this.departmentProfiles.findBy({ departmentId: In(scopeDepartmentIds) })
        : [],
    ]);
    if (roles.length !== roleIds.length) throw new BadRequestException('包含不存在或已停用的角色');
    if (departments.length !== scopeDepartmentIds.length) {
      throw new BadRequestException('数据权限引用的部门不存在');
    }
    const inactiveDepartmentIds = new Set(
      profiles.filter((profile) => !profile.active).map((profile) => profile.departmentId),
    );
    if (scopeDepartmentIds.some((id) => inactiveDepartmentIds.has(id))) {
      throw new BadRequestException('数据权限不能引用已停用的部门');
    }

    const roleById = new Map(roles.map((role) => [role.id, role]));
    const keys = new Set<string>();
    for (const assignment of assignments) {
      if (
        roleById.get(assignment.roleId)?.code === 'SYSTEM_ADMIN' &&
        (assignment.dataScope !== DataScope.ALL || assignment.scopeDepartmentId)
      ) {
        throw new DomainError(
          'SYSTEM_ADMIN_GLOBAL_SCOPE_REQUIRED',
          '系统管理员角色只能授予全部数据范围',
        );
      }
      const departmentScoped = [DataScope.DEPARTMENT, DataScope.DEPARTMENT_TREE].includes(
        assignment.dataScope,
      );
      if (departmentScoped !== Boolean(assignment.scopeDepartmentId)) {
        throw new BadRequestException('部门或部门树数据权限必须指定范围部门');
      }
      const key = `${assignment.roleId}:${assignment.dataScope}:${assignment.scopeDepartmentId ?? ''}`;
      if (keys.has(key)) throw new BadRequestException('用户角色授权不能重复');
      keys.add(key);
    }
  }

  private async assertLastSystemAdministrator(
    manager: EntityManager,
    userId: string,
    nextAssignments: RoleAssignmentWriteInput[],
  ): Promise<void> {
    const systemRole = await manager
      .getRepository(RoleEntity)
      .findOneBy({ code: 'SYSTEM_ADMIN', active: true });
    if (!systemRole) return;

    const currentAssignment = await manager
      .getRepository(UserRoleEntity)
      .exist({ where: { userId, roleId: systemRole.id } });
    const keepsSystemRole = nextAssignments.some((item) => item.roleId === systemRole.id);
    if (!currentAssignment || keepsSystemRole) return;

    const user = await manager.getRepository(UserEntity).findOneBy({ id: userId, active: true });
    if (!user) return;
    const assignments = await manager
      .getRepository(UserRoleEntity)
      .findBy({ roleId: systemRole.id });
    const otherUserIds = [
      ...new Set(assignments.map((item) => item.userId).filter((id) => id !== userId)),
    ];
    const activeAdministratorCount =
      otherUserIds.length === 0
        ? 0
        : await manager.getRepository(UserEntity).countBy({
            id: In(otherUserIds),
            active: true,
          });
    if (activeAdministratorCount === 0) {
      throw new DomainError('LAST_SYSTEM_ADMIN_REQUIRED', '不能移除最后一个启用的系统管理员用户');
    }
  }
}
