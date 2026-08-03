export interface DepartmentNode {
  id: string;
  code: string;
  name: string;
  managerUserId: string | null;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  children: DepartmentNode[];
}

export interface Position {
  id: string;
  code: string;
  name: string;
  departmentId: string | null;
  sortOrder: number;
  active: boolean;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
  active: boolean;
}

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  permissionIds: string[];
  permissionCodes: string[];
}

export interface RoleInput extends Record<string, unknown> {
  code: string;
  name: string;
  description?: string | null;
}

export interface RoleUpdateInput extends Record<string, unknown> {
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface UserMembership {
  id: string;
  departmentId: string;
  departmentName: string;
  positionId: string | null;
  positionName: string | null;
  isPrimary: boolean;
  isDepartmentHead: boolean;
  active: boolean;
}

export type DataScope = 'SELF' | 'DEPARTMENT' | 'DEPARTMENT_TREE' | 'ALL';

export interface UserRoleAssignment {
  assignmentId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  dataScope: DataScope;
  scopeDepartmentId: string | null;
}

export interface IamUser {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  primaryDepartmentId: string | null;
  memberships: UserMembership[];
  roles: UserRoleAssignment[];
}

export interface DepartmentInput extends Record<string, unknown> {
  code: string;
  name: string;
  managerUserId?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface PositionInput extends Record<string, unknown> {
  code: string;
  name: string;
  departmentId?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface UserCreateInput extends Record<string, unknown> {
  username: string;
  displayName: string;
  password: string;
  memberships: UserAssignmentsInput['memberships'];
  roles: UserAssignmentsInput['roles'];
}

export interface UserUpdateInput extends Record<string, unknown> {
  displayName?: string;
  active?: boolean;
}

export interface UserAssignmentsInput extends Record<string, unknown> {
  memberships: Array<{
    departmentId: string;
    positionId?: string | null;
    isPrimary?: boolean;
    isDepartmentHead?: boolean;
    active?: boolean;
  }>;
  roles: Array<{
    roleId: string;
    dataScope: DataScope;
    scopeDepartmentId?: string | null;
  }>;
}
