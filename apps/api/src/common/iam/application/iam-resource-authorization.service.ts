import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataScope, type DataScopeGrant } from '../domain/data-scope';
import { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import { collectDepartmentDescendants } from './organization-tree';
import type { IamResourceScope } from './iam.models';
import { IamSessionProfileService } from './iam-session-profile.service';

/** Evaluates functional permission and its attached data scope against one business resource. */
@Injectable()
export class IamResourceAuthorizationService {
  constructor(
    @Inject(IamSessionProfileService)
    private readonly sessionProfiles: IamSessionProfileService,
    @InjectRepository(DepartmentProfileEntity)
    private readonly departmentProfiles: Repository<DepartmentProfileEntity>,
  ) {}

  async canAccessResource(
    userId: string,
    permissionCode: string,
    ownerUserId: string,
    departmentId: string,
  ): Promise<boolean> {
    const scope = await this.resolveResourceScope(userId, permissionCode);
    return (
      scope.all ||
      (scope.self && ownerUserId === userId) ||
      scope.departmentIds.includes(departmentId)
    );
  }

  async resolveResourceScope(userId: string, permissionCode: string): Promise<IamResourceScope> {
    const profile = await this.sessionProfiles.getSessionProfile(userId);
    const grants = profile.dataScopes.filter((grant) =>
      grant.permissionCodes.includes(permissionCode),
    );
    const departmentIds = new Set(
      grants.flatMap((grant) =>
        grant.scope === DataScope.DEPARTMENT && grant.scopeDepartmentId
          ? [grant.scopeDepartmentId]
          : [],
      ),
    );

    const treeGrants = grants.filter(
      (grant): grant is DataScopeGrant & { scopeDepartmentId: string } =>
        grant.scope === DataScope.DEPARTMENT_TREE && Boolean(grant.scopeDepartmentId),
    );
    if (treeGrants.length > 0) {
      const profiles = await this.departmentProfiles.find();
      for (const grant of treeGrants) {
        for (const departmentId of collectDepartmentDescendants(
          grant.scopeDepartmentId,
          profiles,
        )) {
          departmentIds.add(departmentId);
        }
      }
    }
    return {
      all: grants.some((grant) => grant.scope === DataScope.ALL),
      self: grants.some((grant) => grant.scope === DataScope.SELF),
      departmentIds: [...departmentIds].sort(),
    };
  }
}
