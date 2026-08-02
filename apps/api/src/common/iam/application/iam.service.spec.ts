import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DataScope } from '../domain/data-scope';
import { IamModule } from '../iam.module';
import {
  DepartmentProfileEntity,
  iamEntities,
  MembershipEntity,
  PermissionEntity,
  RoleEntity,
  UserRoleEntity,
} from '../infrastructure/entities';
import { IamService } from './iam.service';
import { resolveLegacyRoleScope } from './legacy-iam-bootstrap.service';

describe('IamService', () => {
  const originalBootstrapAdmin = process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
  let moduleRef: TestingModule;
  let service: IamService;

  beforeAll(async () => {
    delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [UserEntity, DepartmentEntity, ...iamEntities],
          synchronize: true,
        }),
        IamModule,
      ],
    }).compile();
    service = moduleRef.get(IamService);
    await seedOrganization(moduleRef);
  });

  afterAll(async () => {
    await moduleRef?.close();
    if (originalBootstrapAdmin === undefined) {
      delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    } else {
      process.env.OA_BOOTSTRAP_ADMIN_USERNAME = originalBootstrapAdmin;
    }
  });

  it('保留多部门任职，并将每个权限的数据范围限定在授权角色内', async () => {
    await service.updateRolePermissions('role-editor', ['permission-form-edit']);
    await service.updateRolePermissions('role-auditor', ['permission-audit-view']);
    await service.updateUserAssignments('user-multi', {
      memberships: [
        { departmentId: 'dept-a', isPrimary: true },
        { departmentId: 'dept-b', isPrimary: false },
      ],
      roles: [
        {
          roleId: 'role-editor',
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-a',
        },
        { roleId: 'role-auditor', dataScope: DataScope.ALL },
      ],
    });

    const profile = await service.getSessionProfile('user-multi');
    expect(profile.memberships.map((item) => item.departmentId)).toEqual(['dept-a', 'dept-b']);
    expect(profile.roleCodes).toEqual(['AUDITOR', 'FORM_EDITOR']);
    expect(profile.permissionCodes).toEqual(['AUDIT_VIEW', 'FORM_EDIT']);
    expect(profile.dataScopes).toEqual(
      expect.arrayContaining([
        {
          roleCode: 'FORM_EDITOR',
          permissionCodes: ['FORM_EDIT'],
          scope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-a',
        },
        {
          roleCode: 'AUDITOR',
          permissionCodes: ['AUDIT_VIEW'],
          scope: DataScope.ALL,
          scopeDepartmentId: null,
        },
      ]),
    );
    const allScope = profile.dataScopes.find((grant) => grant.scope === DataScope.ALL);
    expect(allScope?.permissionCodes).not.toContain('FORM_EDIT');
  });

  it('按角色和目标部门解析候选人，不泄漏其他部门的局部授权', async () => {
    await service.updateUserAssignments('user-manager-a', {
      memberships: [{ departmentId: 'dept-a', isPrimary: true }],
      roles: [
        {
          roleId: 'role-manager',
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-a',
        },
      ],
    });
    await service.updateUserAssignments('user-manager-b', {
      memberships: [{ departmentId: 'dept-b', isPrimary: true }],
      roles: [
        {
          roleId: 'role-manager',
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-b',
        },
      ],
    });
    await service.updateUserAssignments('user-director', {
      memberships: [{ departmentId: 'dept-root', isPrimary: true }],
      roles: [
        {
          roleId: 'role-manager',
          dataScope: DataScope.DEPARTMENT_TREE,
          scopeDepartmentId: 'dept-root',
        },
      ],
    });

    const candidates = await service.resolveCandidateUsers('DEPARTMENT_MANAGER', 'dept-a');
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'user-manager-a',
      'user-director',
    ]);
    expect(candidates.map((candidate) => candidate.id)).not.toContain('user-manager-b');
  });

  it('审批权限过滤不会拼接另一个部门的角色授权', async () => {
    await service.updateRolePermissions('role-editor', ['permission-form-edit']);
    await service.updateRolePermissions('role-auditor', ['permission-audit-view']);
    await service.updateUserAssignments('user-multi', {
      memberships: [
        { departmentId: 'dept-a', isPrimary: true },
        { departmentId: 'dept-b', isPrimary: false },
      ],
      roles: [
        {
          roleId: 'role-manager',
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-a',
        },
        {
          roleId: 'role-editor',
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-b',
        },
        { roleId: 'role-auditor', dataScope: DataScope.ALL },
      ],
    });
    const resolved = await service.resolveCandidateUsers('DEPARTMENT_MANAGER', 'dept-a');
    const candidate = resolved.find((item) => item.id === 'user-multi');
    expect(candidate).toBeDefined();

    await expect(
      service.filterCandidateUsersByPermissions(
        [candidate!],
        ['FORM_EDIT', 'AUDIT_VIEW'],
        'dept-a',
        'document-owner',
      ),
    ).resolves.toEqual([]);
    await expect(
      service.filterCandidateUsersByPermissions(
        [candidate!],
        ['FORM_EDIT', 'AUDIT_VIEW'],
        'dept-b',
        'document-owner',
      ),
    ).resolves.toEqual([candidate]);
  });

  it('创建和编辑自定义业务角色，并保持角色编码不可变', async () => {
    const created = await service.createRole({
      code: 'CUSTOM_REVIEWER',
      name: '自定义审核人',
      description: '初始说明',
    });
    const updated = await service.updateRole(created.id, {
      name: '区域审核人',
      description: '按区域承担审核',
      active: false,
    });

    expect(updated).toMatchObject({
      code: 'CUSTOM_REVIEWER',
      name: '区域审核人',
      description: '按区域承担审核',
      active: false,
    });
    await expect(
      service.updateRole(created.id, { code: 'RENAMED_REVIEWER' }),
    ).rejects.toMatchObject({ code: 'IAM_ROLE_CODE_IMMUTABLE' });
    await expect(
      service.createRole({ code: 'CUSTOM_REVIEWER', name: '重复角色' }),
    ).rejects.toMatchObject({ code: 'IAM_ROLE_CODE_EXISTS' });
  });

  it('保护系统管理员角色状态和已有权限集合', async () => {
    await service.updateRolePermissions('role-system-admin', [
      'permission-iam-view',
      'permission-iam-manage',
    ]);

    await expect(service.updateRole('role-system-admin', { active: false })).rejects.toMatchObject({
      code: 'SYSTEM_ADMIN_ROLE_PROTECTED',
    });
    await expect(
      service.updateRolePermissions('role-system-admin', ['permission-iam-view']),
    ).rejects.toMatchObject({ code: 'SYSTEM_ADMIN_PERMISSIONS_PROTECTED' });
  });

  it('系统管理员只能使用 ALL 范围，且不能移除最后一个启用管理员', async () => {
    await service.updateUserAssignments('user-admin', {
      memberships: [{ departmentId: 'dept-root', isPrimary: true }],
      roles: [{ roleId: 'role-system-admin', dataScope: DataScope.ALL }],
    });

    await expect(
      service.updateUserAssignments('user-admin', {
        memberships: [{ departmentId: 'dept-root', isPrimary: true }],
        roles: [{ roleId: 'role-system-admin', dataScope: DataScope.SELF }],
      }),
    ).rejects.toMatchObject({ code: 'SYSTEM_ADMIN_GLOBAL_SCOPE_REQUIRED' });
    await expect(
      service.updateUserAssignments('user-admin', {
        memberships: [{ departmentId: 'dept-root', isPrimary: true }],
        roles: [],
      }),
    ).rejects.toMatchObject({ code: 'LAST_SYSTEM_ADMIN_REQUIRED' });

    await service.updateUserAssignments('user-admin-second', {
      memberships: [{ departmentId: 'dept-root', isPrimary: true }],
      roles: [{ roleId: 'role-system-admin', dataScope: DataScope.ALL }],
    });
    await expect(
      service.updateUserAssignments('user-admin', {
        memberships: [{ departmentId: 'dept-root', isPrimary: true }],
        roles: [],
      }),
    ).resolves.toMatchObject({ id: 'user-admin', roles: [] });
  });

  it('按权限绑定的数据范围判断业务资源访问权', async () => {
    await service.updateRolePermissions('role-resource-reader', ['permission-resource-view']);
    await service.updateUserAssignments('user-scope-self', {
      memberships: [{ departmentId: 'dept-a', isPrimary: true }],
      roles: [{ roleId: 'role-resource-reader', dataScope: DataScope.SELF }],
    });
    await service.updateUserAssignments('user-scope-department', {
      memberships: [{ departmentId: 'dept-a', isPrimary: true }],
      roles: [
        {
          roleId: 'role-resource-reader',
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-a',
        },
      ],
    });
    await service.updateUserAssignments('user-scope-tree', {
      memberships: [{ departmentId: 'dept-root', isPrimary: true }],
      roles: [
        {
          roleId: 'role-resource-reader',
          dataScope: DataScope.DEPARTMENT_TREE,
          scopeDepartmentId: 'dept-root',
        },
      ],
    });
    await service.updateUserAssignments('user-scope-all', {
      memberships: [{ departmentId: 'dept-b', isPrimary: true }],
      roles: [{ roleId: 'role-resource-reader', dataScope: DataScope.ALL }],
    });

    await expect(
      service.canAccessResource('user-scope-self', 'RESOURCE_VIEW', 'user-scope-self', 'dept-b'),
    ).resolves.toBe(true);
    await expect(
      service.canAccessResource('user-scope-self', 'RESOURCE_VIEW', 'other-user', 'dept-a'),
    ).resolves.toBe(false);
    await expect(
      service.canAccessResource('user-scope-department', 'RESOURCE_VIEW', 'other-user', 'dept-a'),
    ).resolves.toBe(true);
    await expect(
      service.canAccessResource('user-scope-department', 'RESOURCE_VIEW', 'other-user', 'dept-b'),
    ).resolves.toBe(false);
    await expect(
      service.canAccessResource('user-scope-tree', 'RESOURCE_VIEW', 'other-user', 'dept-a'),
    ).resolves.toBe(true);
    await expect(
      service.canAccessResource('user-scope-tree', 'RESOURCE_VIEW', 'other-user', 'dept-b'),
    ).resolves.toBe(false);
    await expect(
      service.canAccessResource('user-scope-all', 'RESOURCE_VIEW', 'other-user', 'dept-b'),
    ).resolves.toBe(true);
    await expect(
      service.canAccessResource('user-scope-all', 'OTHER_PERMISSION', 'other-user', 'dept-b'),
    ).resolves.toBe(false);

    const selfCandidate = {
      id: 'user-scope-self',
      username: 'user-scope-self',
      displayName: '本人范围用户',
    };
    await expect(
      service.filterCandidateUsersByPermissions(
        [selfCandidate],
        ['RESOURCE_VIEW'],
        'dept-a',
        'other-user',
      ),
    ).resolves.toEqual([]);
    await expect(
      service.filterCandidateUsersByPermissions(
        [selfCandidate],
        ['RESOURCE_VIEW'],
        'dept-a',
        selfCandidate.id,
      ),
    ).resolves.toEqual([selfCandidate]);
  });

  it('首次迁移后清空全部角色也不再回放旧角色字段', async () => {
    const users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    const userRoles = moduleRef.get<Repository<UserRoleEntity>>(getRepositoryToken(UserRoleEntity));
    await users.insert({
      ...testUser('user-legacy-authoritative', '旧账号迁移验证', 'dept-a'),
      roleCodes: ['DEPARTMENT_MANAGER', 'FINANCE_REVIEWER'],
    });

    await service.ensureLegacyAssignments();
    expect(await userRoles.countBy({ userId: 'user-legacy-authoritative' })).toBe(2);

    await userRoles.delete({ userId: 'user-legacy-authoritative' });
    await service.ensureLegacyAssignments();

    expect(await userRoles.countBy({ userId: 'user-legacy-authoritative' })).toBe(0);
  });

  it('显式管理员 bootstrap 仍可为已进入 IAM 的无角色用户授权', async () => {
    const users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    const memberships = moduleRef.get<Repository<MembershipEntity>>(
      getRepositoryToken(MembershipEntity),
    );
    const userRoles = moduleRef.get<Repository<UserRoleEntity>>(getRepositoryToken(UserRoleEntity));
    const userId = 'user-bootstrap-existing-membership';
    await users.insert({
      ...testUser(userId, '管理员自举验证', 'dept-a'),
      roleCodes: ['APPLICANT'],
    });
    await memberships.insert({
      id: 'membership-bootstrap-existing-membership',
      userId,
      departmentId: 'dept-a',
      positionId: null,
      isPrimary: true,
      isDepartmentHead: false,
      active: true,
    });

    process.env.OA_BOOTSTRAP_ADMIN_USERNAME = userId;
    try {
      await service.ensureLegacyAssignments();
    } finally {
      delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    }

    expect(await userRoles.findBy({ userId })).toEqual([
      expect.objectContaining({
        userId,
        roleId: 'role-system-admin',
        dataScope: DataScope.ALL,
        scopeDepartmentId: null,
      }),
    ]);
  });
});

describe('legacy IAM role scope', () => {
  it('keeps applicants local while allowing cross-department approval roles to operate', () => {
    expect(resolveLegacyRoleScope('APPLICANT', 'dept-a')).toEqual({
      dataScope: DataScope.SELF,
      scopeDepartmentId: null,
    });
    expect(resolveLegacyRoleScope('DEPARTMENT_MANAGER', 'dept-a')).toEqual({
      dataScope: DataScope.DEPARTMENT,
      scopeDepartmentId: 'dept-a',
    });
    expect(resolveLegacyRoleScope('FINANCE_REVIEWER', 'dept-finance')).toEqual({
      dataScope: DataScope.ALL,
      scopeDepartmentId: null,
    });
  });
});

async function seedOrganization(moduleRef: TestingModule): Promise<void> {
  const departments = moduleRef.get<Repository<DepartmentEntity>>(
    getRepositoryToken(DepartmentEntity),
  );
  const profiles = moduleRef.get<Repository<DepartmentProfileEntity>>(
    getRepositoryToken(DepartmentProfileEntity),
  );
  const users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  const roles = moduleRef.get<Repository<RoleEntity>>(getRepositoryToken(RoleEntity));
  const permissions = moduleRef.get<Repository<PermissionEntity>>(
    getRepositoryToken(PermissionEntity),
  );

  await departments.insert([
    { id: 'dept-root', code: 'ROOT', name: '总部', managerUserId: null },
    { id: 'dept-a', code: 'A', name: 'A 部门', managerUserId: 'user-manager-a' },
    { id: 'dept-b', code: 'B', name: 'B 部门', managerUserId: 'user-manager-b' },
  ]);
  await profiles.insert([
    { departmentId: 'dept-root', parentDepartmentId: null, sortOrder: 0, active: true },
    { departmentId: 'dept-a', parentDepartmentId: 'dept-root', sortOrder: 1, active: true },
    { departmentId: 'dept-b', parentDepartmentId: null, sortOrder: 2, active: true },
  ]);
  await users.insert([
    testUser('user-multi', '多部门员工', 'dept-a'),
    testUser('user-manager-a', 'A 部门负责人', 'dept-a'),
    testUser('user-manager-b', 'B 部门负责人', 'dept-b'),
    testUser('user-director', '总部负责人', 'dept-root'),
    testUser('user-admin', '系统管理员甲', 'dept-root'),
    testUser('user-admin-second', '系统管理员乙', 'dept-root'),
    testUser('user-scope-self', '本人范围用户', 'dept-a'),
    testUser('user-scope-department', '部门范围用户', 'dept-a'),
    testUser('user-scope-tree', '部门树范围用户', 'dept-root'),
    testUser('user-scope-all', '全部范围用户', 'dept-b'),
  ]);
  await roles.insert([
    role('role-editor', 'FORM_EDITOR', '表单编辑员'),
    role('role-auditor', 'AUDITOR', '审计员'),
    role('role-manager', 'DEPARTMENT_MANAGER', '部门负责人'),
    role('role-system-admin', 'SYSTEM_ADMIN', '系统管理员'),
    role('role-resource-reader', 'RESOURCE_READER', '资源查看人'),
  ]);
  await permissions.insert([
    permission('permission-form-edit', 'FORM_EDIT', '编辑表单', 'FORM'),
    permission('permission-audit-view', 'AUDIT_VIEW', '查看审计', 'AUDIT'),
    permission('permission-iam-view', 'IAM_VIEW', '查看组织权限', 'IAM'),
    permission('permission-iam-manage', 'IAM_MANAGE', '管理组织权限', 'IAM'),
    permission('permission-resource-view', 'RESOURCE_VIEW', '查看业务资源', 'RESOURCE'),
  ]);
}

function testUser(id: string, displayName: string, departmentId: string): UserEntity {
  return {
    id,
    username: id,
    displayName,
    passwordHash: 'unused-in-service-test',
    departmentId,
    roleCodes: [],
    active: true,
  };
}

function role(id: string, code: string, name: string): RoleEntity {
  return { id, code, name, description: null, active: true };
}

function permission(id: string, code: string, name: string, module: string): PermissionEntity {
  return { id, code, name, module, description: null, active: true };
}
