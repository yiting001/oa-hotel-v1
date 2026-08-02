import { DepartmentProfileEntity } from './department-profile.entity';
import { MembershipEntity } from './membership.entity';
import { MenuEntity } from './menu.entity';
import { PermissionEntity } from './permission.entity';
import { PositionEntity } from './position.entity';
import { RoleMenuEntity } from './role-menu.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { RoleEntity } from './role.entity';
import { UserRoleEntity } from './user-role.entity';

export const iamEntities = [
  DepartmentProfileEntity,
  PositionEntity,
  MembershipEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  MenuEntity,
  RoleMenuEntity,
];

export {
  DepartmentProfileEntity,
  MembershipEntity,
  MenuEntity,
  PermissionEntity,
  PositionEntity,
  RoleEntity,
  RoleMenuEntity,
  RolePermissionEntity,
  UserRoleEntity,
};
