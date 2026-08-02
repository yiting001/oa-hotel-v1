import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { SessionUser } from '@oa/contracts';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { DocumentWorkflowService } from '../src/common/workflow/application/document-workflow.service';
import { DocumentIndexEntity } from '../src/common/workflow/infrastructure/document-index.entity';
import { WorkflowDefinitionEntity } from '../src/common/workflow/infrastructure/workflow-definition.entity';
import { WorkflowTaskCandidateEntity } from '../src/common/workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../src/common/workflow/infrastructure/workflow-task.entity';
import type {
  CreatedDocument,
  Envelope,
  LoginResponse,
  Task,
  WorkflowOverviewResponse,
} from './workflow-read-models.types';

const testPassword = 'Demo123!';

describe('工作流读取模型与单据访问权限', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let workflow: DocumentWorkflowService;
  let documents: Repository<DocumentIndexEntity>;
  let definitions: Repository<WorkflowDefinitionEntity>;
  let tasks: Repository<WorkflowTaskEntity>;
  let candidates: Repository<WorkflowTaskCandidateEntity>;
  const tokens = new Map<string, string>();

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'workflow-read-test-secret';
    process.env.OA_DEMO_PASSWORD = testPassword;
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    workflow = moduleRef.get(DocumentWorkflowService);
    documents = moduleRef.get(getRepositoryToken(DocumentIndexEntity));
    definitions = moduleRef.get(getRepositoryToken(WorkflowDefinitionEntity));
    tasks = moduleRef.get(getRepositoryToken(WorkflowTaskEntity));
    candidates = moduleRef.get(getRepositoryToken(WorkflowTaskCandidateEntity));
    server = app.getHttpServer() as Parameters<typeof request>[0];

    for (const username of ['applicant', 'manager', 'finance', 'warehouse']) {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ username, password: testPassword })
        .expect(201);
      tokens.set(username, (response.body as LoginResponse).accessToken);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns only the tasks completed by the current user', async () => {
    const document = await createRequest('已办隔离测试', 100000);
    await submit(document.data.id);

    const managerTask = await taskForDocument('manager', document.data.id);
    await approve('manager', managerTask.id);
    const financeTask = await taskForDocument('finance', document.data.id);
    await approve('finance', financeTask.id);

    const managerCompleted = await completedTasks('manager');
    const financeCompleted = await completedTasks('finance');
    const applicantCompleted = await completedTasks('applicant');

    expect(managerCompleted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: managerTask.id,
          documentId: document.data.id,
          assigneeRole: 'APPLICANT_DEPARTMENT_MANAGER',
          status: 'COMPLETED',
        }),
      ]),
    );
    expect(managerCompleted.map((task) => task.id)).not.toContain(financeTask.id);
    expect(financeCompleted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: financeTask.id,
          documentId: document.data.id,
          assigneeRole: 'FINANCE_REVIEWER',
          status: 'COMPLETED',
        }),
      ]),
    );
    expect(financeCompleted.map((task) => task.id)).not.toContain(managerTask.id);
    expect(applicantCompleted.map((task) => task.documentId)).not.toContain(document.data.id);
  });

  it('returns document, definition, current task, and ordered opinions', async () => {
    const document = await createRequest('流程概览测试', 200000);
    await submit(document.data.id);
    const managerTask = await taskForDocument('manager', document.data.id);
    await approve('manager', managerTask.id);
    const financeTask = await taskForDocument('finance', document.data.id);

    const response = await request(server)
      .get(`/api/v1/workflow/documents/${document.data.id}/overview`)
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    const overview = response.body as WorkflowOverviewResponse;

    expect(overview.document).toMatchObject({
      id: document.data.id,
      documentType: 'CONTRACT_REQUEST',
      module: 'CONTRACT',
      title: '流程概览测试',
      status: 'IN_REVIEW',
      currentStep: 1,
      workflowCode: 'CONTRACT_EXPENSE_REQUEST',
    });
    expect(overview.document.processVersionId).toEqual(expect.any(String));
    expect(overview.document.formVersionId).toEqual(expect.any(String));
    expect(overview.definition).toEqual({
      code: 'CONTRACT_EXPENSE_REQUEST',
      name: '合同/支出请示流程',
      version: 1,
      processVersionId: overview.document.processVersionId,
      steps: ['部门负责人审批', '财务审核'],
    });
    expect(overview.currentTask).toMatchObject({
      id: financeTask.id,
      documentId: document.data.id,
      currentStep: 1,
      processNodeId: 'finance-review',
      processNodeName: '财务审核',
      assigneeRole: 'FINANCE_REVIEWER',
      status: 'PENDING',
    });
    expect(overview.opinions).toEqual([
      expect.objectContaining({
        action: 'SUBMIT',
        comment: '提交审批',
        actorName: '业务申请人',
        actorDepartmentName: '业务部',
        processNodeName: '发起',
      }),
      expect.objectContaining({
        action: 'APPROVE',
        comment: '同意',
        actorName: '部门总监',
        actorDepartmentName: '业务部',
        processNodeName: '部门负责人审批',
      }),
    ]);
    expect(overview.opinions.every((opinion) => !Number.isNaN(Date.parse(opinion.createdAt)))).toBe(
      true,
    );
  });

  it('rejects unauthenticated workflow read requests', async () => {
    const documentId = crypto.randomUUID();
    const completedResponse = await request(server)
      .get('/api/v1/workflow/completed-tasks')
      .expect(401);
    const overviewResponse = await request(server)
      .get(`/api/v1/workflow/documents/${documentId}/overview`)
      .expect(401);

    expect(completedResponse.body.code).toBe('HTTP_401');
    expect(overviewResponse.body.code).toBe('HTTP_401');
  });

  it('rejects document reads outside the current user department scope', async () => {
    const documentId = crypto.randomUUID();
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: '跨部门越权读取',
      applicantId: 'user-warehouse',
      departmentId: 'dept-supply',
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode: 'contract-approval',
      processVersionId: null,
      formVersionId: null,
    });

    const overviewResponse = await request(server)
      .get(`/api/v1/workflow/documents/${documentId}/overview`)
      .auth(token('manager'), { type: 'bearer' })
      .expect(403);
    const historyResponse = await request(server)
      .get(`/api/v1/workflow/documents/${documentId}/history`)
      .auth(token('manager'), { type: 'bearer' })
      .expect(403);

    expect(overviewResponse.body.code).toBe('HTTP_403');
    expect(historyResponse.body.code).toBe('HTTP_403');
  });

  it('requires contract view permission before applying department or all-data scope', async () => {
    const document = await createRequest('数据范围读取测试', 300000);

    for (const username of ['manager', 'finance']) {
      const response = await request(server)
        .get(`/api/v1/workflow/documents/${document.data.id}/overview`)
        .auth(token(username), { type: 'bearer' })
        .expect(200);
      expect((response.body as WorkflowOverviewResponse).document.id).toBe(document.data.id);
    }
    const denied = await request(server)
      .get(`/api/v1/workflow/documents/${document.data.id}/overview`)
      .auth(token('warehouse'), { type: 'bearer' })
      .expect(403);
    expect(denied.body.code).toBe('BUSINESS_MODULE_PERMISSION_DENIED');
  });

  it('does not authorize a user merely because they currently have the same role', async () => {
    const document = await createRequest('固化候选人测试', 400000);
    await submit(document.data.id);
    const managerTask = await taskForDocument('manager', document.data.id);
    expect(await candidates.findBy({ taskId: managerTask.id })).toEqual([
      expect.objectContaining({
        userId: 'user-manager',
        source: 'APPLICANT_DEPARTMENT_MANAGER',
        roleCode: null,
        departmentId: 'dept-business',
      }),
    ]);
    const laterManager = sessionUser({
      id: 'user-later-manager',
      username: 'later-manager',
      displayName: '后加入的部门负责人',
      roleCodes: ['DEPARTMENT_MANAGER'],
      permissionCodes: ['DOCUMENT_VIEW', 'CONTRACT_VIEW', 'WORKFLOW_APPROVE'],
    });

    expect((await workflow.listTasks(laterManager)).map((task) => task.id)).not.toContain(
      managerTask.id,
    );
    await expect(
      workflow.completeTask(
        managerTask.id,
        crypto.randomUUID(),
        '越权尝试',
        'APPROVE',
        laterManager,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('backfills legacy pending-task candidates idempotently', async () => {
    const documentId = crypto.randomUUID();
    const taskId = crypto.randomUUID();
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: '旧待办候选人补录',
      applicantId: 'user-applicant',
      departmentId: 'dept-business',
      status: 'IN_REVIEW',
      revision: 1,
      currentStep: 0,
      workflowCode: 'contract-approval',
      processVersionId: null,
      formVersionId: null,
    });
    await tasks.save({
      id: taskId,
      documentId,
      stepIndex: 0,
      processNodeId: null,
      assigneeType: 'ROLE',
      assigneeValue: null,
      assigneeRole: 'DEPARTMENT_MANAGER',
      status: 'PENDING',
      completedBy: null,
    });

    expect(await candidates.countBy({ taskId })).toBe(0);
    await workflow.onApplicationBootstrap();
    await workflow.onApplicationBootstrap();

    expect(await candidates.findBy({ taskId })).toEqual([
      expect.objectContaining({
        taskId,
        userId: 'user-manager',
        source: 'ROLE',
        roleCode: 'DEPARTMENT_MANAGER',
        departmentId: 'dept-business',
      }),
    ]);
  });

  it('rolls back submission when an approval node has no effective candidate', async () => {
    const documentId = crypto.randomUUID();
    await definitions.save({
      code: `empty-assignee-${documentId}`,
      documentType: `TEST_EMPTY_ASSIGNEE_${documentId}`,
      name: '无人办理测试流程',
      steps: ['ROLE_WITHOUT_ACTIVE_USER'],
      version: 1,
      active: true,
    });
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: '无人办理提交回滚',
      applicantId: 'user-applicant',
      departmentId: 'dept-business',
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode: `empty-assignee-${documentId}`,
      processVersionId: null,
      formVersionId: null,
    });

    await expect(
      workflow.submit(
        documentId,
        crypto.randomUUID(),
        sessionUser({
          id: 'user-applicant',
          username: 'applicant',
          displayName: '业务申请人',
          roleCodes: ['APPLICANT'],
          permissionCodes: ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_VIEW'],
        }),
      ),
    ).rejects.toMatchObject({ code: 'WORKFLOW_ASSIGNEE_EMPTY' });
    expect(await documents.findOneByOrFail({ id: documentId })).toMatchObject({
      status: 'DRAFT',
      currentStep: null,
      revision: 1,
    });
    expect(await tasks.countBy({ documentId })).toBe(0);
    expect(await workflow.readOpinions(documentId)).toEqual([]);
  });

  it('rolls back submission when resolved candidates lack approval permission', async () => {
    const documentId = crypto.randomUUID();
    const workflowCode = `candidate-without-permission-${documentId}`;
    await definitions.save({
      code: workflowCode,
      documentType: `TEST_CANDIDATE_PERMISSION_${documentId}`,
      name: '候选人权限闭环测试',
      steps: ['APPLICANT'],
      version: 1,
      active: true,
    });
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: '候选人无审批权限',
      applicantId: 'user-manager',
      departmentId: 'dept-business',
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode,
      processVersionId: null,
      formVersionId: null,
    });

    await expect(
      workflow.submit(
        documentId,
        crypto.randomUUID(),
        sessionUser({
          id: 'user-manager',
          username: 'manager',
          displayName: '部门总监',
          roleCodes: ['APPLICANT'],
          permissionCodes: ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_VIEW'],
        }),
      ),
    ).rejects.toMatchObject({
      code: 'WORKFLOW_ASSIGNEE_PERMISSION_MISSING',
      details: { requiredPermission: 'WORKFLOW_APPROVE', resolvedCandidateCount: 1 },
    });
    expect(await documents.findOneByOrFail({ id: documentId })).toMatchObject({
      status: 'DRAFT',
      currentStep: null,
      revision: 1,
    });
    expect(await tasks.countBy({ documentId })).toBe(0);
    expect(await workflow.readOpinions(documentId)).toEqual([]);
  });

  async function createRequest(
    title: string,
    amountCents: number,
  ): Promise<Envelope<CreatedDocument>> {
    const response = await request(server)
      .post('/api/v1/contracts/requests')
      .auth(token('applicant'), { type: 'bearer' })
      .send({
        title,
        requestedAt: '2026-07-13',
        amountCents,
        content: `${title}的集成测试内容。`,
        attachments: [],
      })
      .expect(201);
    return response.body as Envelope<CreatedDocument>;
  }

  async function submit(documentId: string): Promise<void> {
    await request(server)
      .post(`/api/v1/workflow/documents/${documentId}/submit`)
      .auth(token('applicant'), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID() })
      .expect(201);
  }

  async function approve(username: string, taskId: string): Promise<void> {
    await request(server)
      .post(`/api/v1/workflow/tasks/${taskId}/approve`)
      .auth(token(username), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID(), comment: '同意' })
      .expect(201);
  }

  async function taskForDocument(username: string, documentId: string): Promise<Task> {
    const response = await request(server)
      .get('/api/v1/workflow/tasks')
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    const task = (response.body as Task[]).find((item) => item.documentId === documentId);
    expect(task).toBeDefined();
    return task as Task;
  }

  async function completedTasks(username: string): Promise<Task[]> {
    const response = await request(server)
      .get('/api/v1/workflow/completed-tasks')
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    return response.body as Task[];
  }

  function token(username: string): string {
    const found = tokens.get(username);
    if (!found) {
      throw new Error(`missing token for ${username}`);
    }
    return found;
  }

  function sessionUser(
    input: Pick<SessionUser, 'id' | 'username' | 'displayName' | 'roleCodes' | 'permissionCodes'>,
  ): SessionUser {
    return {
      ...input,
      departmentId: 'dept-business',
      departmentName: '业务部',
      memberships: [],
      dataScopes: [],
    };
  }
});
