import type { RoleMenuConfig } from '@oa/contracts';
import { apiRequest } from '../../../shared/api';
import type {
  DepartmentInput,
  DepartmentNode,
  IamUser,
  Permission,
  Position,
  PositionInput,
  RoleSummary,
  RoleInput,
  RoleUpdateInput,
  UserAssignmentsInput,
} from '../types/iam';

const endpoint = {
  departments: '/iam/departments',
  department: (id: string) => `/iam/departments/${id}`,
  positions: '/iam/positions',
  position: (id: string) => `/iam/positions/${id}`,
  permissions: '/iam/permissions',
  roles: '/iam/roles',
  role: (id: string) => `/iam/roles/${id}`,
  rolePermissions: (id: string) => `/iam/roles/${id}/permissions`,
  users: '/iam/users',
  menuConfig: '/iam/menus/config',
  roleMenus: (id: string) => `/iam/roles/${id}/menus`,
  userAssignments: (id: string) => `/iam/users/${id}/assignments`,
} as const;

export const iamApi = {
  listDepartments(): Promise<DepartmentNode[]> {
    return apiRequest<DepartmentNode[]>(endpoint.departments);
  },
  createDepartment(input: DepartmentInput): Promise<DepartmentNode> {
    return apiRequest<DepartmentNode>(endpoint.departments, { method: 'POST', body: input });
  },
  updateDepartment(id: string, input: Partial<DepartmentInput>): Promise<DepartmentNode> {
    return apiRequest<DepartmentNode>(endpoint.department(id), { method: 'PATCH', body: input });
  },
  listPositions(departmentId?: string): Promise<Position[]> {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return apiRequest<Position[]>(`${endpoint.positions}${query}`);
  },
  createPosition(input: PositionInput): Promise<Position> {
    return apiRequest<Position>(endpoint.positions, { method: 'POST', body: input });
  },
  updatePosition(id: string, input: Partial<PositionInput>): Promise<Position> {
    return apiRequest<Position>(endpoint.position(id), { method: 'PATCH', body: input });
  },
  listPermissions(): Promise<Permission[]> {
    return apiRequest<Permission[]>(endpoint.permissions);
  },
  listRoles(): Promise<RoleSummary[]> {
    return apiRequest<RoleSummary[]>(endpoint.roles);
  },
  createRole(input: RoleInput): Promise<RoleSummary> {
    return apiRequest<RoleSummary>(endpoint.roles, { method: 'POST', body: input });
  },
  updateRole(id: string, input: RoleUpdateInput): Promise<RoleSummary> {
    return apiRequest<RoleSummary>(endpoint.role(id), { method: 'PATCH', body: input });
  },
  saveRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleSummary> {
    return apiRequest<RoleSummary>(endpoint.rolePermissions(roleId), {
      method: 'PUT',
      body: { permissionIds },
    });
  },
  listRoleMenuConfigs(): Promise<RoleMenuConfig[]> {
    return apiRequest<RoleMenuConfig[]>(endpoint.menuConfig);
  },
  saveRoleHiddenMenus(roleId: string, hiddenMenuIds: string[]): Promise<RoleMenuConfig> {
    return apiRequest<RoleMenuConfig>(endpoint.roleMenus(roleId), {
      method: 'PUT',
      body: { hiddenMenuIds },
    });
  },
  listUsers(): Promise<IamUser[]> {
    return apiRequest<IamUser[]>(endpoint.users);
  },
  saveUserAssignments(userId: string, input: UserAssignmentsInput): Promise<IamUser> {
    return apiRequest<IamUser>(endpoint.userAssignments(userId), { method: 'PUT', body: input });
  },
};
