import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { BatchApprovalResult } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../src/common/auth/auth.service';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { DocumentWorkflowService } from '../src/common/workflow/application/document-workflow.service';
import { DocumentIndexEntity } from '../src/common/workflow/infrastructure/document-index.entity';
import { WorkflowDefinitionEntity } from '../src/common/workflow/infrastructure/workflow-definition.entity';
import { WorkflowTaskEntity } from '../src/common/workflow/infrastructure/workflow-task.entity';

interface LoginResponse {
  accessToken: string;
}

describe('批量审批 HTTP 命令', () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let officeToken: string;
  let documentIds: string[];
  let taskIds: string[];

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'workflow-batch-approval-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    const { AppModule } = await import('../src/app.module');
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'office', password: 'Demo123!' })
      .expect(201);
    officeToken = (login.body as LoginResponse).accessToken;
    ({ documentIds, taskIds } = await seedBatchTasks(moduleRef));
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  it('returns partial results and replays the exact stored result for one request id', async () => {
    const requestId = randomUUID();
    const missingTaskId = randomUUID();
    const payload = {
      requestId,
      taskIds: [taskIds[0], missingTaskId, taskIds[1]],
      comment: '批量确认资料完整，同意办理。',
    };
    const firstResponse = await request(server)
      .post('/api/v1/workflow/tasks/batch-approve')
      .auth(officeToken, { type: 'bearer' })
      .send(payload)
      .expect(201);
    const first = firstResponse.body as BatchApprovalResult;

    expect(first).toMatchObject({ requestId, total: 3, succeeded: 2, failed: 1 });
    expect(first.results).toEqual([
      expect.objectContaining({ taskId: taskIds[0], status: 'SUCCEEDED', code: null }),
      expect.objectContaining({ taskId: missingTaskId, status: 'FAILED', code: 'HTTP_404' }),
      expect.objectContaining({ taskId: taskIds[1], status: 'SUCCEEDED', code: null }),
    ]);

    const replay = await request(server)
      .post('/api/v1/workflow/tasks/batch-approve')
      .auth(officeToken, { type: 'bearer' })
      .send(payload)
      .expect(201);
    expect(replay.body).toEqual(first);

    const conflict = await request(server)
      .post('/api/v1/workflow/tasks/batch-approve')
      .auth(officeToken, { type: 'bearer' })
      .send({ ...payload, taskIds: [taskIds[0]] })
      .expect(409);
    expect(conflict.body.code).toBe('WORKFLOW_BATCH_REQUEST_CONFLICT');

    const documents = moduleRef.get<Repository<DocumentIndexEntity>>(
      getRepositoryToken(DocumentIndexEntity),
    );
    const tasks = moduleRef.get<Repository<WorkflowTaskEntity>>(
      getRepositoryToken(WorkflowTaskEntity),
    );
    for (const documentId of documentIds) {
      expect(await documents.findOneByOrFail({ id: documentId })).toMatchObject({
        status: 'APPROVED',
        revision: 3,
      });
    }
    for (const taskId of taskIds) {
      expect(await tasks.findOneByOrFail({ id: taskId })).toMatchObject({
        status: 'COMPLETED',
        completedBy: 'user-office',
      });
    }
  });
});

async function seedBatchTasks(
  moduleRef: TestingModule,
): Promise<{ documentIds: string[]; taskIds: string[] }> {
  const definitions = moduleRef.get<Repository<WorkflowDefinitionEntity>>(
    getRepositoryToken(WorkflowDefinitionEntity),
  );
  const documents = moduleRef.get<Repository<DocumentIndexEntity>>(
    getRepositoryToken(DocumentIndexEntity),
  );
  const tasks = moduleRef.get<Repository<WorkflowTaskEntity>>(
    getRepositoryToken(WorkflowTaskEntity),
  );
  const workflow = moduleRef.get(DocumentWorkflowService);
  const applicant = await moduleRef.get(AuthService).getSessionUser('user-applicant');
  const workflowCode = `BATCH_OFFICE_${randomUUID()}`;
  await definitions.save({
    code: workflowCode,
    documentType: `BATCH_OFFICE_TEST_${randomUUID()}`,
    name: '办公室批量审批测试流程',
    steps: ['OFFICE_REVIEWER'],
    version: 1,
    active: true,
  });
  const documentIds = [randomUUID(), randomUUID()];
  for (const [index, documentId] of documentIds.entries()) {
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: `批量审批测试单据 ${index + 1}`,
      applicantId: applicant.id,
      departmentId: applicant.departmentId,
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode,
      processVersionId: null,
      formVersionId: null,
    });
    await workflow.submit(documentId, randomUUID(), applicant);
  }
  const pending = await tasks.find({
    where: documentIds.map((documentId) => ({ documentId, status: 'PENDING' })),
    order: { documentId: 'ASC' },
  });
  return { documentIds, taskIds: pending.map((task) => task.id) };
}
