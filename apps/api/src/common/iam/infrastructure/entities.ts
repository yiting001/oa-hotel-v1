import { DepartmentProfileEntity } from './department-profile.entity';
import { MembershipEntity } from './membership.entity';
import { PermissionEntity } from './permission.entity';
import { PositionEntity } from './position.entity';
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
];

export {
  DepartmentProfileEntity,
  MembershipEntity,
  PermissionEntity,
  PositionEntity,
  RoleEntity,
  RolePermissionEntity,
  UserRoleEntity,
};
