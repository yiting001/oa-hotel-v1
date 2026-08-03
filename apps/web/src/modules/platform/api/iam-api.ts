import type { MenuInput, MenuNode, MenuTreeNode, RoleMenuAssignment } from '@oa/contracts';
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
  UserCreateInput,
  UserUpdateInput,
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
  user: (id: string) => `/iam/users/${id}`,
  userPassword: (id: string) => `/iam/users/${id}/password`,
  menus: '/iam/menus',
  menu: (id: string) => `/iam/menus/${id}`,
  menuRoles: '/iam/menus/roles',
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
  deleteDepartment(id: string): Promise<void> {
    return apiRequest<void>(endpoint.department(id), { method: 'DELETE' });
  },
  deletePosition(id: string): Promise<void> {
    return apiRequest<void>(endpoint.position(id), { method: 'DELETE' });
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
  deleteRole(id: string): Promise<void> {
    return apiRequest<void>(endpoint.role(id), { method: 'DELETE' });
  },
  saveRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleSummary> {
    return apiRequest<RoleSummary>(endpoint.rolePermissions(roleId), {
      method: 'PUT',
      body: { permissionIds },
    });
  },
  menuTree(): Promise<MenuTreeNode[]> {
    return apiRequest<MenuTreeNode[]>(endpoint.menus);
  },
  createMenu(input: MenuInput): Promise<MenuNode> {
    return apiRequest<MenuNode>(endpoint.menus, { method: 'POST', body: { ...input } });
  },
  updateMenu(id: string, input: MenuInput): Promise<MenuNode> {
    return apiRequest<MenuNode>(endpoint.menu(id), { method: 'PATCH', body: { ...input } });
  },
  deleteMenu(id: string): Promise<void> {
    return apiRequest<void>(endpoint.menu(id), { method: 'DELETE' });
  },
  listRoleMenuAssignments(): Promise<RoleMenuAssignment[]> {
    return apiRequest<RoleMenuAssignment[]>(endpoint.menuRoles);
  },
  saveRoleMenus(roleId: string, menuIds: string[]): Promise<RoleMenuAssignment> {
    return apiRequest<RoleMenuAssignment>(endpoint.roleMenus(roleId), {
      method: 'PUT',
      body: { menuIds },
    });
  },
  listUsers(): Promise<IamUser[]> {
    return apiRequest<IamUser[]>(endpoint.users);
  },
  createUser(input: UserCreateInput): Promise<IamUser> {
    return apiRequest<IamUser>(endpoint.users, { method: 'POST', body: input });
  },
  updateUser(id: string, input: UserUpdateInput): Promise<IamUser> {
    return apiRequest<IamUser>(endpoint.user(id), { method: 'PATCH', body: input });
  },
  resetUserPassword(id: string, password: string): Promise<void> {
    return apiRequest<void>(endpoint.userPassword(id), { method: 'PUT', body: { password } });
  },
  saveUserAssignments(userId: string, input: UserAssignmentsInput): Promise<IamUser> {
    return apiRequest<IamUser>(endpoint.userAssignments(userId), { method: 'PUT', body: input });
  },
};
