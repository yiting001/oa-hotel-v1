import type { SessionUser, WorkbenchBox, WorkbenchItem } from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import type { IamService } from '../../iam/application/iam.service';
import type { WorkbenchRepository, WorkbenchRepositoryPage } from '../domain/workbench.repository';
import type { WorkbenchQuery, WorkbenchRepositoryContext } from '../domain/workbench.types';
import { normalizeWorkbenchQuery } from './workbench-query.input';
import { WorkbenchQueryService } from './workbench-query.service';

const user: SessionUser = {
  id: 'user-1',
  username: 'reader',
  displayName: '经办人',
  departmentId: 'dept-1',
  departmentName: '业务部',
  roleCodes: ['APPLICANT'],
  permissionCodes: [
    'DOCUMENT_VIEW',
    'DOCUMENT_FOLLOW',
    'CONTRACT_VIEW',
    'SEAL_VIEW',
    'WORKFLOW_APPROVE',
  ],
  memberships: [],
  dataScopes: [],
};

class MemoryWorkbenchRepository implements WorkbenchRepository {
  contexts: WorkbenchRepositoryContext[] = [];
  queries: WorkbenchQuery[] = [];
  page: WorkbenchRepositoryPage = { total: 0, items: [] };

  async count(box: WorkbenchBox, context: WorkbenchRepositoryContext): Promise<number> {
    this.contexts.push(context);
    if (box === 'PENDING' && !context.canApprove) return 0;
    if (box === 'FOLLOWING' && !context.canFollow) return 0;
    const counts: Record<WorkbenchBox, number> = {
      PENDING: 4,
      COMPLETED: 3,
      MINE: 2,
      DRAFTS: 1,
      FOLLOWING: 5,
      COPIED: 6,
    };
    return counts[box];
  }

  async findPage(query: WorkbenchQuery, context: WorkbenchRepositoryContext) {
    this.queries.push(query);
    this.contexts.push(context);
    return query.box === 'PENDING' && !context.canApprove ? { total: 0, items: [] } : this.page;
  }
}

describe('WorkbenchQueryService', () => {
  it('summarizes every box after reducing access to current double-key module grants', async () => {
    const repository = new MemoryWorkbenchRepository();
    const result = await new WorkbenchQueryService(repository, iam()).getSummary(
      user,
      new Date('2026-07-13T08:00:00.000Z'),
    );

    expect(result).toEqual({
      generatedAt: '2026-07-13T08:00:00.000Z',
      counts: { PENDING: 4, COMPLETED: 3, MINE: 2, DRAFTS: 1, FOLLOWING: 5, COPIED: 6 },
    });
    expect(repository.contexts).toHaveLength(6);
    expect(repository.contexts[0]).toEqual({
      userId: user.id,
      allowedModules: ['CONTRACT', 'SEAL'],
      canApprove: true,
      canFollow: true,
      moduleScopes: {
        CONTRACT: { all: true, self: false, departmentIds: [] },
        SEAL: { all: true, self: false, departmentIds: [] },
      },
    });
  });

  it('hides pending assignments after current approval permission is revoked', async () => {
    const repository = new MemoryWorkbenchRepository();
    repository.page = { total: 1, items: [{} as WorkbenchItem] };
    const service = new WorkbenchQueryService(repository, iam());
    const revoked = {
      ...user,
      permissionCodes: user.permissionCodes.filter((code) => code !== 'WORKFLOW_APPROVE'),
    };

    const summary = await service.getSummary(revoked);
    const page = await service.getItems({ box: 'PENDING' }, revoked);

    expect(summary.counts.PENDING).toBe(0);
    expect(summary.counts.COMPLETED).toBe(3);
    expect(page.total).toBe(0);
    expect(repository.contexts.at(-1)).toMatchObject({ canApprove: false });
  });

  it('normalizes pagination and all supported filters before querying persistence', async () => {
    const repository = new MemoryWorkbenchRepository();
    repository.page = { total: 1, items: [{} as WorkbenchItem] };

    const result = await new WorkbenchQueryService(repository, iam()).getItems(
      {
        box: 'MINE',
        page: '2',
        pageSize: '10',
        keyword: '  采购  ',
        documentType: 'CONTRACT_REQUEST',
        applicantId: ' user-1 ',
        departmentId: ' dept-1 ',
        status: 'IN_REVIEW',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
      },
      user,
    );

    expect(result).toMatchObject({ box: 'MINE', page: 2, pageSize: 10, total: 1 });
    expect(repository.queries[0]).toEqual({
      box: 'MINE',
      page: 2,
      pageSize: 10,
      keyword: '采购',
      documentType: 'CONTRACT_REQUEST',
      applicantId: 'user-1',
      departmentId: 'dept-1',
      status: 'IN_REVIEW',
      dateFrom: new Date('2026-06-30T16:00:00.000Z'),
      dateTo: new Date('2026-07-31T15:59:59.999Z'),
    });
  });

  it.each([
    [{ box: 'UNKNOWN' }, '箱体'],
    [{ box: 'MINE', page: 0 }, 'page'],
    [{ box: 'MINE', pageSize: 101 }, 'pageSize'],
    [{ box: 'MINE', documentType: 'UNKNOWN' }, '流程类型'],
    [{ box: 'MINE', status: 'UNKNOWN' }, '单据状态'],
    [{ box: 'MINE', dateFrom: '2026-02-31' }, '日期'],
    [{ box: 'MINE', dateFrom: '2026-08-01', dateTo: '2026-07-01' }, '开始日期'],
  ])('rejects malformed query %#', (input, message) => {
    expect(() => normalizeWorkbenchQuery(input)).toThrow(message);
  });
});

function iam(): IamService {
  return {
    resolveResourceScope: async () => ({ all: true, self: false, departmentIds: [] }),
  } as unknown as IamService;
}
