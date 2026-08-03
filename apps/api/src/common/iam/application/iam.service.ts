import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import type {
  MenuInput,
  MenuNode,
  MenuTreeNode,
  RoleMenuAssignment,
  SessionUser,
} from '@oa/contracts';
import type { PermissionEntity } from '../infrastructure/permission.entity';
import type { PositionEntity } from '../infrastructure/position.entity';
import { IamAccessService } from './iam-access.service';
import type {
  CandidateUser,
  DepartmentNode,
  DepartmentWriteInput,
  IamSessionProfile,
  IamResourceScope,
  PositionWriteInput,
  RoleCreateInput,
  RoleSummary,
  RoleUpdateInput,
  UserAccessSummary,
  UserAssignmentsWriteInput,
  UserCreateInput,
  UserUpdateInput,
} from './iam.models';
import { IamMenuService } from './iam-menu.service';
import { IamOrganizationService } from './iam-organization.service';
import { IamRoleService } from './iam-role.service';
import { IamResourceAuthorizationService } from './iam-resource-authorization.service';
import { IamSessionProfileService } from './iam-session-profile.service';
import { LegacyIamBootstrapService } from './legacy-iam-bootstrap.service';

/** Public facade used by HTTP, authentication and workflow modules. */
@Injectable()
export class IamService implements OnApplicationBootstrap {
  constructor(
    @Inject(IamOrganizationService)
    private readonly organization: IamOrganizationService,
    @Inject(IamAccessService)
    private readonly access: IamAccessService,
    @Inject(IamRoleService)
    private readonly roleManagement: IamRoleService,
    @Inject(IamMenuService)
    private readonly menus: IamMenuService,
    @Inject(IamSessionProfileService)
    private readonly sessionProfiles: IamSessionProfileService,
    @Inject(IamResourceAuthorizationService)
    private readonly resourceAuthorization: IamResourceAuthorizationService,
    @Inject(LegacyIamBootstrapService)
    private readonly legacyBootstrap: LegacyIamBootstrapService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureLegacyAssignments();
  }

  /** Re-runnable bridge called after legacy development users are seeded. */
  ensureLegacyAssignments(): Promise<void> {
    return this.legacyBootstrap.ensureInitialized(true);
  }

  async listDepartments(): Promise<DepartmentNode[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.organization.listDepartmentTree();
  }

  createDepartment(
    input: DepartmentWriteInput & Required<Pick<DepartmentWriteInput, 'code' | 'name'>>,
  ): Promise<DepartmentNode> {
    return this.organization.createDepartment(input);
  }

  updateDepartment(id: string, input: DepartmentWriteInput): Promise<DepartmentNode> {
    return this.organization.updateDepartment(id, input);
  }

  async listPositions(departmentId?: string): Promise<PositionEntity[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.organization.listPositions(departmentId);
  }

  createPosition(
    input: PositionWriteInput & Required<Pick<PositionWriteInput, 'code' | 'name'>>,
  ): Promise<PositionEntity> {
    return this.organization.createPosition(input);
  }

  updatePosition(id: string, input: PositionWriteInput): Promise<PositionEntity> {
    return this.organization.updatePosition(id, input);
  }

  deleteDepartment(id: string): Promise<void> {
    return this.organization.deleteDepartment(id);
  }

  deletePosition(id: string): Promise<void> {
    return this.organization.deletePosition(id);
  }

  async listRoles(): Promise<RoleSummary[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.listRoles();
  }

  async createRole(input: RoleCreateInput): Promise<RoleSummary> {
    const role = await this.roleManagement.create(input);
    await this.menus.grantAllMenusToRole(role.id);
    return role;
  }

  updateRole(roleId: string, input: RoleUpdateInput): Promise<RoleSummary> {
    return this.roleManagement.update(roleId, input);
  }

  deleteRole(roleId: string): Promise<void> {
    return this.roleManagement.delete(roleId);
  }

  listPermissions(): Promise<PermissionEntity[]> {
    return this.access.listPermissions();
  }

  async listUsers(): Promise<UserAccessSummary[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.listUsers();
  }

  async createUser(input: UserCreateInput): Promise<UserAccessSummary> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.createUser(input);
  }

  updateUser(userId: string, input: UserUpdateInput): Promise<UserAccessSummary> {
    return this.access.updateUser(userId, input);
  }

  resetUserPassword(userId: string, password: string): Promise<void> {
    return this.access.resetUserPassword(userId, password);
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleSummary> {
    return this.roleManagement.replacePermissions(roleId, permissionIds);
  }

  async menuTree(): Promise<MenuTreeNode[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.menus.menuTree();
  }

  createMenu(input: MenuInput): Promise<MenuNode> {
    return this.menus.createMenu(input);
  }

  updateMenu(id: string, input: MenuInput): Promise<MenuNode> {
    return this.menus.updateMenu(id, input);
  }

  deleteMenu(id: string): Promise<void> {
    return this.menus.deleteMenu(id);
  }

  async listRoleMenuAssignments(): Promise<RoleMenuAssignment[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.menus.listRoleMenuAssignments();
  }

  updateRoleMenus(roleId: string, menuIds: string[]): Promise<RoleMenuAssignment> {
    return this.menus.replaceRoleMenus(roleId, menuIds);
  }

  async menuTreeForUser(user: SessionUser): Promise<MenuTreeNode[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.menus.menuTreeForUser(user);
  }

  updateUserAssignments(
    userId: string,
    input: UserAssignmentsWriteInput,
  ): Promise<UserAccessSummary> {
    return this.access.replaceUserAssignments(userId, input);
  }

  async getSessionProfile(userId: string): Promise<IamSessionProfile> {
    await this.legacyBootstrap.ensureInitialized();
    return this.sessionProfiles.getSessionProfile(userId);
  }

  async resolveCandidateUsers(roleCode: string, departmentId: string): Promise<CandidateUser[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.resolveCandidateUsers(roleCode, departmentId);
  }

  async resolveApplicantDepartmentManagerUsers(departmentId: string): Promise<CandidateUser[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.organization.resolveApplicantDepartmentManagerUsers(departmentId);
  }

  async filterCandidateUsersByPermissions(
    candidates: CandidateUser[],
    permissionCodes: string[],
    departmentId: string,
    ownerUserId: string,
  ): Promise<CandidateUser[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.filterCandidateUsersByPermissions(
      candidates,
      permissionCodes,
      departmentId,
      ownerUserId,
    );
  }

  async canAccessResource(
    userId: string,
    permissionCode: string,
    ownerUserId: string,
    departmentId: string,
  ): Promise<boolean> {
    await this.legacyBootstrap.ensureInitialized();
    return this.resourceAuthorization.canAccessResource(
      userId,
      permissionCode,
      ownerUserId,
      departmentId,
    );
  }

  resolveResourceScope(userId: string, permissionCode: string): Promise<IamResourceScope> {
    return this.resourceAuthorization.resolveResourceScope(userId, permissionCode);
  }
}
