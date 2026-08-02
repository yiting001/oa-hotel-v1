import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
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
} from './iam.models';
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

  async listRoles(): Promise<RoleSummary[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.listRoles();
  }

  createRole(input: RoleCreateInput): Promise<RoleSummary> {
    return this.roleManagement.create(input);
  }

  updateRole(roleId: string, input: RoleUpdateInput): Promise<RoleSummary> {
    return this.roleManagement.update(roleId, input);
  }

  listPermissions(): Promise<PermissionEntity[]> {
    return this.access.listPermissions();
  }

  async listUsers(): Promise<UserAccessSummary[]> {
    await this.legacyBootstrap.ensureInitialized();
    return this.access.listUsers();
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleSummary> {
    return this.roleManagement.replacePermissions(roleId, permissionIds);
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
