import { DepartmentProfileEntity } from './department-profile.entity';
import { MembershipEntity } from './membership.entity';
import { PermissionEntity } from './permission.entity';
import { PositionEntity } from './position.entity';
import { RoleHiddenMenuEntity } from './role-hidden-menu.entity';
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
  RoleHiddenMenuEntity,
];

export {
  DepartmentProfileEntity,
  RoleHiddenMenuEntity,
  MembershipEntity,
  PermissionEntity,
  PositionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserRoleEntity,
};
