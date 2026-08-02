import type { DepartmentEntity } from '../../auth/department.entity';
import type { UserEntity } from '../../auth/user.entity';
import type { MembershipEntity } from '../infrastructure/membership.entity';
import type { PermissionEntity } from '../infrastructure/permission.entity';
import type { PositionEntity } from '../infrastructure/position.entity';
import type { RolePermissionEntity } from '../infrastructure/role-permission.entity';
import type { RoleEntity } from '../infrastructure/role.entity';
import type { UserRoleEntity } from '../infrastructure/user-role.entity';
import type { RoleSummary, UserAccessSummary } from './iam.models';

export function mapRoleSummaries(
  roles: RoleEntity[],
  permissions: PermissionEntity[],
  rolePermissions: RolePermissionEntity[],
): RoleSummary[] {
  const permissionById = new Map(permissions.map((permission) => [permission.id, permission]));
  const permissionIdsByRole = groupValues(rolePermissions, 'roleId', 'permissionId');

  return roles.map((role) => {
    const permissionIds = permissionIdsByRole.get(role.id) ?? [];
    return {
      ...role,
      permissionIds: [...permissionIds].sort(),
      permissionCodes: permissionIds
        .map((id) => permissionById.get(id)?.code)
        .filter((code): code is string => Boolean(code))
        .sort(),
    };
  });
}

export function mapUserSummaries(input: {
  users: UserEntity[];
  departments: DepartmentEntity[];
  positions: PositionEntity[];
  memberships: MembershipEntity[];
  roles: RoleEntity[];
  userRoles: UserRoleEntity[];
}): UserAccessSummary[] {
  const departmentById = new Map(input.departments.map((item) => [item.id, item]));
  const positionById = new Map(input.positions.map((item) => [item.id, item]));
  const roleById = new Map(input.roles.map((item) => [item.id, item]));
  const membershipsByUser = groupEntities(input.memberships, (item) => item.userId);
  const rolesByUser = groupEntities(input.userRoles, (item) => item.userId);

  return input.users.map((user) => {
    const memberships = (membershipsByUser.get(user.id) ?? [])
      .map((membership) => ({
        id: membership.id,
        departmentId: membership.departmentId,
        departmentName: departmentById.get(membership.departmentId)?.name ?? '',
        positionId: membership.positionId,
        positionName: membership.positionId
          ? (positionById.get(membership.positionId)?.name ?? null)
          : null,
        isPrimary: membership.isPrimary,
        isDepartmentHead: membership.isDepartmentHead,
        active: membership.active,
      }))
      .sort(compareMemberships);
    const roles = (rolesByUser.get(user.id) ?? [])
      .map((assignment) => {
        const role = roleById.get(assignment.roleId);
        if (!role) return null;
        return {
          assignmentId: assignment.id,
          roleId: role.id,
          roleCode: role.code,
          roleName: role.name,
          dataScope: assignment.dataScope,
          scopeDepartmentId: assignment.scopeDepartmentId,
        };
      })
      .filter((role): role is NonNullable<typeof role> => role !== null)
      .sort((left, right) => left.roleName.localeCompare(right.roleName));

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      active: user.active,
      primaryDepartmentId:
        memberships.find((membership) => membership.active && membership.isPrimary)?.departmentId ??
        null,
      memberships,
      roles,
    };
  });
}

function compareMemberships(
  left: UserAccessSummary['memberships'][number],
  right: UserAccessSummary['memberships'][number],
): number {
  if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
  return left.departmentName.localeCompare(right.departmentName);
}

function groupEntities<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return result;
}

function groupValues<T extends Record<K | V, string>, K extends keyof T, V extends keyof T>(
  items: T[],
  keyProperty: K,
  valueProperty: V,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const item of items) {
    const key = item[keyProperty];
    result.set(key, [...(result.get(key) ?? []), item[valueProperty]]);
  }
  return result;
}
