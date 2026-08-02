import { Inject, Injectable } from '@nestjs/common';
import {
  WORKBENCH_BOXES,
  type SessionUser,
  type WorkbenchPage,
  type WorkbenchSummary,
} from '@oa/contracts';
import {
  allowedBusinessModules,
  scopedBusinessPermission,
} from '../../auth/business-module-permission';
import { IamService } from '../../iam/application/iam.service';
import { WORKBENCH_REPOSITORY, type WorkbenchRepository } from '../domain/workbench.repository';
import type { WorkbenchQueryInput, WorkbenchRepositoryContext } from '../domain/workbench.types';
import { normalizeWorkbenchQuery } from './workbench-query.input';

@Injectable()
export class WorkbenchQueryService {
  constructor(
    @Inject(WORKBENCH_REPOSITORY)
    private readonly repository: WorkbenchRepository,
    @Inject(IamService)
    private readonly iam: IamService,
  ) {}

  async getSummary(user: SessionUser, at = new Date()): Promise<WorkbenchSummary> {
    const context = await this.context(user);
    const values = await Promise.all(
      WORKBENCH_BOXES.map((box) => this.repository.count(box, context)),
    );
    return {
      generatedAt: at.toISOString(),
      counts: Object.fromEntries(
        WORKBENCH_BOXES.map((box, index) => [box, values[index] ?? 0]),
      ) as WorkbenchSummary['counts'],
    };
  }

  async getItems(input: WorkbenchQueryInput, user: SessionUser): Promise<WorkbenchPage> {
    const query = normalizeWorkbenchQuery(input);
    const result = await this.repository.findPage(query, await this.context(user));
    return {
      box: query.box,
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      items: result.items,
    };
  }

  private async context(user: SessionUser): Promise<WorkbenchRepositoryContext> {
    const allowedModules = allowedBusinessModules(user, 'VIEW');
    const moduleScopes = Object.fromEntries(
      await Promise.all(
        allowedModules.map(async (module) => [
          module,
          await this.iam.resolveResourceScope(user.id, scopedBusinessPermission(module, 'VIEW')),
        ]),
      ),
    );
    return {
      userId: user.id,
      canApprove: user.permissionCodes.includes('WORKFLOW_APPROVE'),
      canFollow: user.permissionCodes.includes('DOCUMENT_FOLLOW'),
      allowedModules,
      moduleScopes,
    };
  }
}
