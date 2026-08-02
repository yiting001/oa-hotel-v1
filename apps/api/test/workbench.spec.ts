import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  DirectoryUser,
  DocumentFollowState,
  WorkbenchPage,
  WorkbenchSummary,
  WorkflowCopyCommandResult,
  WorkflowCopyDelivery,
} from '@oa/contracts';
import request from 'supertest';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { DocumentIndexEntity } from '../src/common/workflow/infrastructure/document-index.entity';
import { WorkflowTaskCandidateEntity } from '../src/common/workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../src/common/workflow/infrastructure/workflow-task.entity';

interface LoginResponse {
  accessToken: string;
}

describe('个人工作台 HTTP 聚合查询', () => {
  const originalBootstrapAdmin = process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
  const tokens = new Map<string, string>();
  let moduleRef: TestingModule;
  let app: INestApplication;
  let server: Parameters<typeof request>[0];

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'workbench-test-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    const { AppModule } = await import('../src/app.module');
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    await seedWorkbenchRows();
    server = app.getHttpServer() as Parameters<typeof request>[0];

    for (const username of ['applicant', 'office']) {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ username, password: 'Demo123!' })
        .expect(201);
      tokens.set(username, (response.body as LoginResponse).accessToken);
    }
  });

  afterAll(async () => {
    await app?.close();
    if (originalBootstrapAdmin === undefined) {
      delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    } else {
      process.env.OA_BOOTSTRAP_ADMIN_USERNAME = originalBootstrapAdmin;
    }
  });

  it('returns box counts after current module permissions are applied', async () => {
    const applicant = await summary('applicant');
    const office = await summary('office');

    expect(applicant.counts).toEqual({
      PENDING: 0,
      COMPLETED: 0,
      MINE: 3,
      DRAFTS: 1,
      FOLLOWING: 0,
      COPIED: 0,
    });
    expect(office.counts).toEqual({
      PENDING: 1,
      COMPLETED: 2,
      MINE: 0,
      DRAFTS: 0,
      FOLLOWING: 0,
      COPIED: 0,
    });
  });

  it('does not expose a candidate task after its business module view key is absent', async () => {
    const response = await request(server)
      .get('/api/v1/workbench/items?box=PENDING')
      .auth(token('office'), { type: 'bearer' })
      .expect(200);
    const page = response.body as WorkbenchPage;

    expect(page.total).toBe(1);
    expect(page.items.map((item) => item.documentId)).toEqual(['workbench-doc-contract-b']);
    expect(page.items[0]).toMatchObject({
      applicantName: '业务申请人',
      departmentName: '业务部',
    });
  });

  it('paginates with stable id tie-breaking and applies all document filters', async () => {
    const common =
      'box=MINE&pageSize=1&documentType=CONTRACT_REQUEST&applicantId=user-applicant' +
      '&departmentId=dept-business&dateFrom=2026-07-01&dateTo=2026-07-31';
    const first = await items('applicant', `${common}&page=1`);
    const second = await items('applicant', `${common}&page=2`);
    const draft = await items(
      'applicant',
      `${common}&page=1&status=DRAFT&keyword=${encodeURIComponent('业务申请人')}`,
    );

    expect(first.total).toBe(2);
    expect(first.items.map((item) => item.documentId)).toEqual(['workbench-doc-contract-b']);
    expect(second.items.map((item) => item.documentId)).toEqual(['workbench-doc-contract-a']);
    expect(draft.items.map((item) => item.documentId)).toEqual(['workbench-doc-contract-a']);
  });

  it('keeps multiple completed tasks for one document reachable across pages', async () => {
    const first = await items('office', 'box=COMPLETED&page=1&pageSize=1');
    const second = await items('office', 'box=COMPLETED&page=2&pageSize=1');

    expect(first.total).toBe(2);
    expect(second.total).toBe(2);
    expect(first.items[0]?.id).not.toBe(second.items[0]?.id);
    expect(first.items[0]?.documentId).toBe('workbench-doc-contract-b');
    expect(second.items[0]?.documentId).toBe('workbench-doc-contract-b');
  });

  it('persists follows and independent copy read state with recipient scope checks', async () => {
    const followed = await request(server)
      .post('/api/v1/workbench/documents/workbench-doc-contract-b/follow')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(201);
    expect(followed.body as DocumentFollowState).toMatchObject({
      documentId: 'workbench-doc-contract-b',
      following: true,
    });
    expect((await summary('applicant')).counts.FOLLOWING).toBe(1);
    const following = await items('applicant', 'box=FOLLOWING');
    expect(following.items).toEqual([
      expect.objectContaining({
        documentId: 'workbench-doc-contract-b',
        followedAt: expect.any(String),
      }),
    ]);

    const recipients = await request(server)
      .get('/api/v1/workflow/documents/workbench-doc-contract-b/copy-recipients')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    const recipientIds = (recipients.body as DirectoryUser[]).map((recipient) => recipient.id);
    expect(recipientIds).toContain('user-office');
    expect(recipientIds).not.toContain('user-applicant');
    expect(recipientIds).not.toContain('user-warehouse');

    const copied = await request(server)
      .post('/api/v1/workflow/documents/workbench-doc-contract-b/copies')
      .auth(token('applicant'), { type: 'bearer' })
      .send({ recipientIds: ['user-office'] })
      .expect(201);
    const delivery = (copied.body as WorkflowCopyCommandResult).deliveries[0];
    expect(delivery).toMatchObject({
      documentId: 'workbench-doc-contract-b',
      senderId: 'user-applicant',
      recipientId: 'user-office',
      readAt: null,
    });
    expect((await summary('office')).counts.COPIED).toBe(1);
    expect((await items('office', 'box=COPIED')).items).toEqual([
      expect.objectContaining({
        copyId: delivery?.id,
        copySenderName: '业务申请人',
        copyReadAt: null,
      }),
    ]);

    const read = await request(server)
      .post(`/api/v1/workflow/copies/${delivery?.id}/read`)
      .auth(token('office'), { type: 'bearer' })
      .expect(201);
    expect((read.body as WorkflowCopyDelivery).readAt).toEqual(expect.any(String));
    expect((await items('office', 'box=COPIED')).items[0]?.copyReadAt).toEqual(expect.any(String));

    const denied = await request(server)
      .post('/api/v1/workflow/documents/workbench-doc-contract-b/copies')
      .auth(token('applicant'), { type: 'bearer' })
      .send({ recipientIds: ['user-warehouse'] })
      .expect(403);
    expect(denied.body.code).toBe('WORKFLOW_COPY_RECIPIENT_DENIED');

    await request(server)
      .delete('/api/v1/workbench/documents/workbench-doc-contract-b/follow')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    expect((await summary('applicant')).counts.FOLLOWING).toBe(0);
  });

  it('rejects invalid boxes and unsafe pagination values', async () => {
    const invalidBox = await request(server)
      .get('/api/v1/workbench/items?box=UNKNOWN')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(400);
    const invalidPageSize = await request(server)
      .get('/api/v1/workbench/items?box=MINE&pageSize=101')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(400);

    expect(invalidBox.body.code).toBe('WORKBENCH_QUERY_INVALID');
    expect(invalidPageSize.body.code).toBe('WORKBENCH_QUERY_INVALID');
  });

  async function seedWorkbenchRows(): Promise<void> {
    const documents = moduleRef.get<Repository<DocumentIndexEntity>>(
      getRepositoryToken(DocumentIndexEntity),
    );
    const tasks = moduleRef.get<Repository<WorkflowTaskEntity>>(
      getRepositoryToken(WorkflowTaskEntity),
    );
    const candidates = moduleRef.get<Repository<WorkflowTaskCandidateEntity>>(
      getRepositoryToken(WorkflowTaskCandidateEntity),
    );
    const time = new Date('2026-07-10T08:00:00.000Z');
    await documents.save([
      documentRow('workbench-doc-contract-a', 'CONTRACT_REQUEST', 'CONTRACT', 'DRAFT', time),
      documentRow('workbench-doc-contract-b', 'CONTRACT_REQUEST', 'CONTRACT', 'IN_REVIEW', time),
      documentRow('workbench-doc-supply', 'MATERIAL_PURCHASE', 'SUPPLY', 'IN_REVIEW', time),
    ]);
    await tasks.save([
      taskRow('workbench-task-contract-pending', 'workbench-doc-contract-b', 'PENDING', null, time),
      taskRow('workbench-task-supply-pending', 'workbench-doc-supply', 'PENDING', null, time),
      taskRow(
        'workbench-task-contract-completed',
        'workbench-doc-contract-b',
        'COMPLETED',
        'user-office',
        time,
      ),
      taskRow(
        'workbench-task-contract-completed-second',
        'workbench-doc-contract-b',
        'COMPLETED',
        'user-office',
        time,
      ),
    ]);
    await candidates.save([
      candidateRow('workbench-candidate-contract', 'workbench-task-contract-pending'),
      candidateRow('workbench-candidate-supply', 'workbench-task-supply-pending'),
      candidateRow(
        'workbench-candidate-applicant-without-approve',
        'workbench-task-contract-pending',
        'user-applicant',
      ),
    ]);
  }

  async function summary(username: string): Promise<WorkbenchSummary> {
    const response = await request(server)
      .get('/api/v1/workbench/summary')
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    return response.body as WorkbenchSummary;
  }

  async function items(username: string, query: string): Promise<WorkbenchPage> {
    const response = await request(server)
      .get(`/api/v1/workbench/items?${query}`)
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    return response.body as WorkbenchPage;
  }

  function token(username: string): string {
    const value = tokens.get(username);
    if (!value) throw new Error(`missing token for ${username}`);
    return value;
  }
});

function documentRow(
  id: string,
  documentType: DocumentIndexEntity['documentType'],
  module: DocumentIndexEntity['module'],
  status: string,
  time: Date,
): DocumentIndexEntity {
  return {
    id,
    documentType,
    module,
    title: id.endsWith('-a') ? '七月合同草稿' : '七月运营申请',
    applicantId: 'user-applicant',
    departmentId: 'dept-business',
    status,
    documentNo: null,
    revision: 1,
    currentStep: status === 'IN_REVIEW' ? 0 : null,
    workflowCode: 'WORKBENCH_TEST',
    processVersionId: null,
    formVersionId: null,
    createdAt: time,
    updatedAt: time,
  };
}

function taskRow(
  id: string,
  documentId: string,
  status: string,
  completedBy: string | null,
  time: Date,
): WorkflowTaskEntity {
  return {
    id,
    documentId,
    stepIndex: 0,
    processNodeId: 'office-review',
    assigneeType: 'ROLE',
    assigneeValue: 'OFFICE_REVIEWER',
    assigneeRole: 'OFFICE_REVIEWER',
    status,
    completedBy,
    createdAt: time,
    updatedAt: time,
  };
}

function candidateRow(
  id: string,
  taskId: string,
  userId = 'user-office',
): WorkflowTaskCandidateEntity {
  return {
    id,
    taskId,
    userId,
    source: 'ROLE',
    roleCode: 'OFFICE_REVIEWER',
    departmentId: 'dept-business',
  };
}
