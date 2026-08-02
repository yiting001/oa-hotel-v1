import { FindOperator, type FindOptionsWhere, type ObjectLiteral, type Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DataScope } from '../domain/data-scope';
import { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import { MembershipEntity } from '../infrastructure/membership.entity';
import { PermissionEntity } from '../infrastructure/permission.entity';
import { PositionEntity } from '../infrastructure/position.entity';
import { RolePermissionEntity } from '../infrastructure/role-permission.entity';
import { RoleEntity } from '../infrastructure/role.entity';
import { UserRoleEntity } from '../infrastructure/user-role.entity';
import { IamSessionProfileService } from './iam-session-profile.service';

type RepositoryDouble<T extends ObjectLiteral> = {
  find: ReturnType<typeof vi.fn<Repository<T>['find']>>;
  findBy: ReturnType<typeof vi.fn<Repository<T>['findBy']>>;
  findOneBy: ReturnType<typeof vi.fn<Repository<T>['findOneBy']>>;
};

describe('IamSessionProfileService', () => {
  let users: RepositoryDouble<UserEntity>;
  let departments: RepositoryDouble<DepartmentEntity>;
  let departmentProfiles: RepositoryDouble<DepartmentProfileEntity>;
  let positions: RepositoryDouble<PositionEntity>;
  let memberships: RepositoryDouble<MembershipEntity>;
  let roles: RepositoryDouble<RoleEntity>;
  let permissions: RepositoryDouble<PermissionEntity>;
  let userRoles: RepositoryDouble<UserRoleEntity>;
  let rolePermissions: RepositoryDouble<RolePermissionEntity>;
  let service: IamSessionProfileService;

  beforeEach(() => {
    users = repositoryDouble<UserEntity>();
    departments = repositoryDouble<DepartmentEntity>();
    departmentProfiles = repositoryDouble<DepartmentProfileEntity>();
    positions = repositoryDouble<PositionEntity>();
    memberships = repositoryDouble<MembershipEntity>();
    roles = repositoryDouble<RoleEntity>();
    permissions = repositoryDouble<PermissionEntity>();
    userRoles = repositoryDouble<UserRoleEntity>();
    rolePermissions = repositoryDouble<RolePermissionEntity>();
    service = new IamSessionProfileService(
      asRepository(users),
      asRepository(departments),
      asRepository(departmentProfiles),
      asRepository(positions),
      asRepository(memberships),
      asRepository(roles),
      asRepository(permissions),
      asRepository(userRoles),
      asRepository(rolePermissions),
    );
  });

  it('只查询当前用户的引用数据，并保留排序和停用过滤语义', async () => {
    users.findOneBy.mockResolvedValue(user());
    memberships.findBy.mockResolvedValue([
      membership('membership-b', 'department-b'),
      membership('membership-a', 'department-a', {
        isPrimary: true,
        positionId: 'position-a',
      }),
      membership('membership-disabled', 'department-disabled'),
      membership('membership-inactive', 'department-a', { active: false }),
    ]);
    userRoles.findBy.mockResolvedValue([
      assignment('assignment-zeta', 'role-zeta', DataScope.ALL),
      assignment('assignment-alpha', 'role-alpha', DataScope.DEPARTMENT, 'department-a'),
      assignment(
        'assignment-disabled-scope',
        'role-alpha',
        DataScope.DEPARTMENT,
        'department-disabled',
      ),
      assignment('assignment-inactive-role', 'role-inactive', DataScope.ALL),
    ]);
    roles.findBy.mockResolvedValue([
      role('role-zeta', 'ZETA_ROLE', '末尾角色'),
      role('role-alpha', 'ALPHA_ROLE', '首字母角色'),
    ]);
    departments.findBy.mockResolvedValue([
      department('department-b', 'B 部门'),
      department('department-a', 'A 部门'),
      department('department-disabled', '停用部门'),
    ]);
    positions.findBy.mockResolvedValue([
      {
        id: 'position-a',
        code: 'POSITION_A',
        name: 'A 岗位',
        departmentId: 'department-a',
        sortOrder: 0,
        active: true,
      },
    ]);
    departmentProfiles.findBy.mockResolvedValue([
      profile('department-a', true),
      profile('department-b', true),
      profile('department-disabled', false),
    ]);
    rolePermissions.findBy.mockResolvedValue([
      { roleId: 'role-zeta', permissionId: 'permission-zeta' },
      { roleId: 'role-alpha', permissionId: 'permission-alpha' },
      { roleId: 'role-alpha', permissionId: 'permission-inactive' },
    ]);
    permissions.findBy.mockResolvedValue([
      permission('permission-zeta', 'Z_PERMISSION'),
      permission('permission-alpha', 'A_PERMISSION'),
    ]);

    const result = await service.getSessionProfile('user-target');

    expect(result).toEqual({
      userId: 'user-target',
      roleCodes: ['ALPHA_ROLE', 'ZETA_ROLE'],
      permissionCodes: ['A_PERMISSION', 'Z_PERMISSION'],
      memberships: [
        {
          id: 'membership-a',
          departmentId: 'department-a',
          departmentName: 'A 部门',
          positionId: 'position-a',
          positionName: 'A 岗位',
          isPrimary: true,
          isDepartmentHead: false,
          active: true,
        },
        {
          id: 'membership-b',
          departmentId: 'department-b',
          departmentName: 'B 部门',
          positionId: null,
          positionName: null,
          isPrimary: false,
          isDepartmentHead: false,
          active: true,
        },
      ],
      dataScopes: [
        {
          roleCode: 'ZETA_ROLE',
          permissionCodes: ['Z_PERMISSION'],
          scope: DataScope.ALL,
          scopeDepartmentId: null,
        },
        {
          roleCode: 'ALPHA_ROLE',
          permissionCodes: ['A_PERMISSION'],
          scope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'department-a',
        },
      ],
    });
    expect(users.findOneBy).toHaveBeenCalledWith({ id: 'user-target', active: true });
    expect(memberships.findBy).toHaveBeenCalledWith({ userId: 'user-target' });
    expect(userRoles.findBy).toHaveBeenCalledWith({ userId: 'user-target' });
    const roleWhere = firstFindByWhere(roles);
    const departmentWhere = firstFindByWhere(departments);
    const positionWhere = firstFindByWhere(positions);
    const rolePermissionWhere = firstFindByWhere(rolePermissions);
    const permissionWhere = firstFindByWhere(permissions);
    const profileWhere = firstFindByWhere(departmentProfiles);
    expect(findValues(roleWhere.id)).toEqual(['role-zeta', 'role-alpha', 'role-inactive']);
    expect(roleWhere.active).toBe(true);
    expect(findValues(departmentWhere.id)).toEqual([
      'department-b',
      'department-a',
      'department-disabled',
    ]);
    expect(findValues(positionWhere.id)).toEqual(['position-a']);
    expect(findValues(rolePermissionWhere.roleId)).toEqual(['role-zeta', 'role-alpha']);
    expect(findValues(permissionWhere.id)).toEqual([
      'permission-zeta',
      'permission-alpha',
      'permission-inactive',
    ]);
    expect(permissionWhere.active).toBe(true);
    expect(findValues(profileWhere.departmentId)).toEqual([
      'department-b',
      'department-a',
      'department-disabled',
    ]);
    expect(users.find).not.toHaveBeenCalled();
    expect(departments.find).not.toHaveBeenCalled();
    expect(departmentProfiles.find).not.toHaveBeenCalled();
    expect(positions.find).not.toHaveBeenCalled();
    expect(memberships.find).not.toHaveBeenCalled();
    expect(roles.find).not.toHaveBeenCalled();
    expect(permissions.find).not.toHaveBeenCalled();
    expect(userRoles.find).not.toHaveBeenCalled();
    expect(rolePermissions.find).not.toHaveBeenCalled();
  });

  it('拒绝为停用或不存在的用户构建会话画像', async () => {
    users.findOneBy.mockResolvedValue(null);

    await expect(service.getSessionProfile('user-disabled')).rejects.toMatchObject({
      status: 404,
      message: '用户不存在或已停用',
    });
    expect(memberships.findBy).not.toHaveBeenCalled();
    expect(userRoles.findBy).not.toHaveBeenCalled();
  });
});

function repositoryDouble<T extends ObjectLiteral>(): RepositoryDouble<T> {
  return {
    find: vi.fn<Repository<T>['find']>(),
    findBy: vi.fn<Repository<T>['findBy']>(),
    findOneBy: vi.fn<Repository<T>['findOneBy']>(),
  };
}

function asRepository<T extends ObjectLiteral>(double: RepositoryDouble<T>): Repository<T> {
  return double as unknown as Repository<T>;
}

function firstFindByWhere<T extends ObjectLiteral>(
  double: RepositoryDouble<T>,
): FindOptionsWhere<T> {
  const where = double.findBy.mock.calls[0]?.[0];
  if (!where || Array.isArray(where)) throw new Error('预期使用单个定向查询条件');
  return where;
}

function findValues(value: unknown): unknown {
  if (!(value instanceof FindOperator)) throw new Error('预期使用定向查询操作符');
  return value.value;
}

function user(): UserEntity {
  return {
    id: 'user-target',
    username: 'target',
    displayName: '目标用户',
    passwordHash: 'unused',
    departmentId: 'department-a',
    roleCodes: [],
    active: true,
  };
}

function membership(
  id: string,
  departmentId: string,
  overrides: Partial<MembershipEntity> = {},
): MembershipEntity {
  return {
    id,
    userId: 'user-target',
    departmentId,
    positionId: null,
    isPrimary: false,
    isDepartmentHead: false,
    active: true,
    ...overrides,
  };
}

function assignment(
  id: string,
  roleId: string,
  dataScope: DataScope,
  scopeDepartmentId: string | null = null,
): UserRoleEntity {
  return { id, userId: 'user-target', roleId, dataScope, scopeDepartmentId };
}

function role(id: string, code: string, name: string): RoleEntity {
  return { id, code, name, description: null, active: true };
}

function department(id: string, name: string): DepartmentEntity {
  return { id, code: id.toUpperCase(), name, managerUserId: null };
}

function profile(departmentId: string, active: boolean): DepartmentProfileEntity {
  return { departmentId, parentDepartmentId: null, sortOrder: 0, active };
}

function permission(id: string, code: string): PermissionEntity {
  return {
    id,
    code,
    name: code,
    module: 'TEST',
    description: null,
    active: true,
  };
}
