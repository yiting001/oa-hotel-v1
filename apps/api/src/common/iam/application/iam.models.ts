import type { DataScope, DataScopeGrant } from '../domain/data-scope';

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

export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  permissionIds: string[];
  permissionCodes: string[];
}

export interface MembershipSummary {
  id: string;
  departmentId: string;
  departmentName: string;
  positionId: string | null;
  positionName: string | null;
  isPrimary: boolean;
  isDepartmentHead: boolean;
  active: boolean;
}

export interface RoleAssignmentSummary {
  assignmentId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  dataScope: DataScope;
  scopeDepartmentId: string | null;
}

export interface UserAccessSummary {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  primaryDepartmentId: string | null;
  memberships: MembershipSummary[];
  roles: RoleAssignmentSummary[];
}

export interface IamSessionProfile {
  userId: string;
  permissionCodes: string[];
  roleCodes: string[];
  memberships: MembershipSummary[];
  dataScopes: DataScopeGrant[];
}

export interface IamResourceScope {
  all: boolean;
  self: boolean;
  departmentIds: string[];
}

export interface CandidateUser {
  id: string;
  username: string;
  displayName: string;
}

export interface DepartmentWriteInput {
  code?: string;
  name?: string;
  managerUserId?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface PositionWriteInput {
  code?: string;
  name?: string;
  departmentId?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface RoleCreateInput {
  code: string;
  name: string;
  description?: string | null;
}

export interface RoleUpdateInput {
  /** Accepted by the HTTP DTO only so attempts to mutate the immutable code get a stable error. */
  code?: string;
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface MembershipWriteInput {
  departmentId: string;
  positionId?: string | null;
  isPrimary?: boolean;
  isDepartmentHead?: boolean;
  active?: boolean;
}

export interface RoleAssignmentWriteInput {
  roleId: string;
  dataScope: DataScope;
  scopeDepartmentId?: string | null;
}

export interface UserAssignmentsWriteInput {
  memberships: MembershipWriteInput[];
  roles: RoleAssignmentWriteInput[];
}

export interface UserCreateInput {
  username: string;
  displayName: string;
  password: string;
  memberships: MembershipWriteInput[];
  roles: RoleAssignmentWriteInput[];
}

export interface UserUpdateInput {
  displayName?: string;
  active?: boolean;
}
