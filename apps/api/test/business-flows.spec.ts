import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hash } from 'argon2';
import request from 'supertest';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { UserEntity } from '../src/common/auth/user.entity';
import { DataScope } from '../src/common/iam/domain/data-scope';
import { IamService } from '../src/common/iam/application/iam.service';

interface LoginResponse {
  accessToken: string;
}

interface Envelope<T> {
  data: T;
  document: { id: string; status: string };
}

interface CreatedDocument {
  id: string;
}

interface Task {
  id: string;
  documentId: string;
}

describe('首批业务模块集成流程', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  const tokens = new Map<string, string>();

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    await seedGenericDocumentUser();
    server = app.getHttpServer() as Parameters<typeof request>[0];
    for (const username of [
      'applicant',
      'manager',
      'finance',
      'office',
      'procurement',
      'warehouse',
      'adminapprove',
      'bizapprove',
      'execpre',
      'exec',
      'generic',
    ]) {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ username, password: 'Demo123!' });
      if (response.status !== 201) {
        throw new Error(`login failed for ${username}: ${JSON.stringify(response.body)}`);
      }
      tokens.set(username, (response.body as LoginResponse).accessToken);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('enforces functional permissions and exposes only a minimal user directory', async () => {
    const applicantSession = await request(server)
      .get('/api/v1/auth/me')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    expect(applicantSession.body.permissionCodes).toEqual(
      expect.arrayContaining([
        'CONTRACT_CREATE',
        'CONTRACT_VIEW',
        'SEAL_CREATE',
        'SEAL_VIEW',
        'SUPPLY_CREATE',
        'SUPPLY_VIEW',
      ]),
    );

    const deniedCreate = await request(server)
      .post('/api/v1/contracts/requests')
      .auth(token('manager'), { type: 'bearer' })
      .send({})
      .expect(403);
    const deniedSealExecution = await request(server)
      .post(`/api/v1/seals/use-requests/${crypto.randomUUID()}/execute`)
      .auth(token('applicant'), { type: 'bearer' })
      .send({})
      .expect(403);
    const deniedSupplyIssue = await request(server)
      .post(`/api/v1/supplies/requisitions/${crypto.randomUUID()}/issue`)
      .auth(token('applicant'), { type: 'bearer' })
      .send({})
      .expect(403);
    const directory = await request(server)
      .get('/api/v1/auth/users')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);

    expect(deniedCreate.body.code).toBe('PERMISSION_DENIED');
    expect(deniedSealExecution.body.code).toBe('PERMISSION_DENIED');
    expect(deniedSupplyIssue.body.code).toBe('PERMISSION_DENIED');
    expect(directory.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'user-applicant',
          displayName: '业务申请人',
          departmentId: 'dept-business',
          departmentName: '业务部',
        }),
      ]),
    );
    expect(directory.body[0]).not.toHaveProperty('permissionCodes');
    expect(directory.body[0]).not.toHaveProperty('roleCodes');
    expect(directory.body[0]).not.toHaveProperty('memberships');
  });

  it('does not let generic document permissions open every business package', async () => {
    const deniedRequests = await Promise.all([
      request(server)
        .post('/api/v1/contracts/requests')
        .auth(token('generic'), { type: 'bearer' })
        .send({}),
      request(server).get('/api/v1/seals/assets').auth(token('generic'), { type: 'bearer' }),
      request(server).get('/api/v1/supplies/items').auth(token('generic'), { type: 'bearer' }),
    ]);

    for (const response of deniedRequests) {
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
      expect(response.body.details.required).toEqual(
        expect.arrayContaining([expect.stringMatching(/^(CONTRACT|SEAL|SUPPLY)_(CREATE|VIEW)$/)]),
      );
    }
  });

  it('supports contract request return, resubmit, contract approval, and payment guard', async () => {
    const requestDocument = await post<Envelope<CreatedDocument>>(
      'applicant',
      '/contracts/requests',
      {
        title: '空调维保支出请示',
        requestedAt: '2026-07-11',
        amountCents: 500000,
        content: '申请签订年度空调维保合同。',
        attachments: [],
      },
    );
    const prematureContract = await request(server)
      .post('/api/v1/contracts')
      .auth(token('applicant'), { type: 'bearer' })
      .send({
        requestId: requestDocument.data.id,
        signingDepartmentId: 'dept-business',
        signingDate: '2026-07-11',
        name: '未审批请示关联测试',
        amountCents: 500000,
        counterpartyFullName: '上海示例维保有限公司',
        contentReason: '验证未通过请示不能发起合同',
        needsSeal: false,
        attachments: [],
      })
      .expect(422);
    expect(prematureContract.body.code).toBe('CONTRACT_REQUEST_NOT_APPROVED');

    await submit('applicant', requestDocument.data.id);
    let task = await firstTask('manager');
    await request(server)
      .post(`/api/v1/workflow/tasks/${task.id}/return`)
      .auth(token('manager'), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID(), comment: '补充预算说明' })
      .expect(201);
    await submit('applicant', requestDocument.data.id);
    task = await firstTask('manager');
    await approve('manager', task.id);
    task = await firstTask('finance');
    await approve('finance', task.id);

    const contract = await post<Envelope<CreatedDocument>>('applicant', '/contracts', {
      requestId: requestDocument.data.id,
      signingDepartmentId: 'dept-business',
      signingDate: '2026-07-11',
      name: '空调维保合同',
      amountCents: 500000,
      counterpartyFullName: '上海示例维保有限公司',
      contentReason: '年度维保服务',
      needsSeal: true,
      attachments: [],
    });
    await submit('applicant', contract.data.id);
    for (const role of ['adminapprove', 'bizapprove', 'execpre', 'exec']) {
      task = await firstTask(role);
      await approve(role, task.id);
    }

    const overflow = await request(server)
      .post('/api/v1/contracts/payments')
      .auth(token('applicant'), { type: 'bearer' })
      .send({
        contractId: contract.data.id,
        project: '空调维保首款',
        contractStartDate: '2026-07-11',
        contractEndDate: '2027-07-10',
        contractSigningDate: '2026-07-11',
        contractAmountCents: 500000,
        budgetAmountCents: 500000,
        budgetExecutedCents: 0,
        accountingSubject: '维修费',
        maintenanceEstimateCents: 0,
        counterpartyFullName: '上海示例维保有限公司',
        plannedPaymentCount: 2,
        paymentSequence: 1,
        executedAmountCents: 0,
        plannedProgress: '50%',
        actualProgress: '50%',
        paymentMethod: 'CHEQUE',
        paymentReason: '首付款',
        invoiceNumber: 'FP001',
        warrantyStartDate: '2026-07-11',
        warrantyEndDate: '2027-07-10',
        paymentAmountCents: 600000,
        attachments: [],
      })
      .expect(422);
    expect(overflow.body.code).toBe('INSUFFICIENT_AMOUNT');

    const payment = await post<
      Envelope<{
        contractSigningDate: string;
        contractAmountCents: number;
        counterpartyFullName: string;
      }>
    >('applicant', '/contracts/payments', {
      contractId: contract.data.id,
      project: '合同快照可信校验',
      contractStartDate: '2026-07-11',
      contractEndDate: '2027-07-10',
      contractSigningDate: '2000-01-01',
      contractAmountCents: 1,
      budgetAmountCents: 500000,
      budgetExecutedCents: 0,
      accountingSubject: '维修费',
      maintenanceEstimateCents: 0,
      counterpartyFullName: '伪造乙方',
      plannedPaymentCount: 2,
      paymentSequence: 1,
      executedAmountCents: 0,
      plannedProgress: '50%',
      actualProgress: '50%',
      paymentMethod: 'CHEQUE',
      paymentReason: '首付款',
      invoiceNumber: 'FP002',
      warrantyStartDate: '2026-07-11',
      warrantyEndDate: '2027-07-10',
      paymentAmountCents: 100000,
      attachments: [],
    });
    expect(payment.data).toMatchObject({
      contractSigningDate: '2026-07-11',
      contractAmountCents: 500000,
      counterpartyFullName: '上海示例维保有限公司',
    });
  });

  it('supports seal borrow approval, checkout, return, and date validation', async () => {
    await request(server)
      .post('/api/v1/seals/borrow-requests')
      .auth(token('applicant'), { type: 'bearer' })
      .send({
        useDate: '2026-07-12',
        plannedReturnDate: '2026-07-11',
        companionIds: [],
        destination: '银行',
        sealAssetNames: ['公司公章'],
        content: '办理资料',
        attachments: [],
      })
      .expect(422);

    const borrow = await post<Envelope<CreatedDocument>>('applicant', '/seals/borrow-requests', {
      useDate: '2026-07-12',
      plannedReturnDate: '2026-07-13',
      companionIds: ['user-office'],
      destination: '银行',
      sealAssetNames: ['公司公章'],
      content: '办理合同资料',
      attachments: [],
    });
    expect(borrow.data).toMatchObject({ sealAssetNames: ['公司公章'] });
    await submit('applicant', borrow.data.id);
    for (const role of ['office', 'execpre', 'exec']) {
      const task = await firstTask(role);
      await approve(role, task.id);
    }
    await request(server)
      .post(`/api/v1/seals/borrow-requests/${borrow.data.id}/checkout`)
      .auth(token('office'), { type: 'bearer' })
      .send({ actualRecipient: '业务申请人', checkedOutAt: '2026-07-12T10:00:00.000Z' })
      .expect(201);
    await request(server)
      .post(`/api/v1/seals/borrow-requests/${borrow.data.id}/return`)
      .auth(token('office'), { type: 'bearer' })
      .send({
        returnedAt: '2026-07-12T16:00:00.000Z',
        returnCondition: '完好',
        exceptionNote: null,
      })
      .expect(201);
  });

  it('supports material purchase and partial requisition issue', async () => {
    const purchase = await post<Envelope<CreatedDocument>>(
      'applicant',
      '/supplies/purchase-requests',
      {
        applicationDate: '2026-07-11',
        items: [
          {
            name: 'A4 复印纸',
            brand: null,
            specification: '80g',
            unit: '包',
            requestedQuantity: '10',
            monthlyConsumption: '3',
            referenceUnitPriceCents: 2500,
            remark: null,
          },
        ],
      },
    );
    await submit('applicant', purchase.data.id);
    for (const role of ['manager', 'procurement', 'finance']) {
      const task = await firstTask(role);
      await approve(role, task.id);
    }

    const requisition = await post<Envelope<CreatedDocument>>(
      'applicant',
      '/supplies/requisitions',
      {
        applicationDate: '2026-07-11',
        contactUserId: 'user-applicant',
        items: [{ materialItemId: 'item-paper', requestedQuantity: '5', purpose: '部门办公' }],
        attachments: [],
      },
    );
    await submit('applicant', requisition.data.id);
    for (const role of ['manager', 'warehouse']) {
      const task = await firstTask(role);
      await approve(role, task.id);
    }
    const issued = await post<Envelope<{ issueStatus: string }>>(
      'warehouse',
      `/supplies/requisitions/${requisition.data.id}/issue`,
      {
        issuedAt: '2026-07-11T09:00:00.000Z',
        items: [{ materialItemId: 'item-paper', issuedQuantity: '3' }],
      },
    );
    expect(issued.data.issueStatus).toBe('PARTIALLY_ISSUED');
  });

  async function post<T>(username: string, path: string, body: object): Promise<T> {
    const response = await request(server)
      .post(`/api/v1${path}`)
      .auth(token(username), { type: 'bearer' })
      .send(body)
      .expect(201);
    return response.body as T;
  }

  async function seedGenericDocumentUser(): Promise<void> {
    const users = app.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    const iam = app.get(IamService);
    await users.save({
      id: 'user-generic-document',
      username: 'generic',
      displayName: '通用单据用户',
      passwordHash: await hash('Demo123!'),
      departmentId: 'dept-business',
      roleCodes: [],
      active: true,
    });
    const role =
      (await iam.listRoles()).find((item) => item.code === 'GENERIC_DOCUMENT_USER') ??
      (await iam.createRole({ code: 'GENERIC_DOCUMENT_USER', name: '通用单据用户' }));
    const permissions = await iam.listPermissions();
    await iam.updateRolePermissions(
      role.id,
      permissions
        .filter((item) => ['DOCUMENT_CREATE', 'DOCUMENT_VIEW'].includes(item.code))
        .map((item) => item.id),
    );
    await iam.updateUserAssignments('user-generic-document', {
      memberships: [{ departmentId: 'dept-business', isPrimary: true }],
      roles: [{ roleId: role.id, dataScope: DataScope.SELF }],
    });
  }

  async function submit(username: string, documentId: string): Promise<void> {
    await request(server)
      .post(`/api/v1/workflow/documents/${documentId}/submit`)
      .auth(token(username), { type: 'bearer' })
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

  async function firstTask(username: string): Promise<Task> {
    const response = await request(server)
      .get('/api/v1/workflow/tasks')
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    const tasks = response.body as Task[];
    expect(tasks.length).toBeGreaterThan(0);
    return tasks[0];
  }

  function token(username: string): string {
    const found = tokens.get(username);
    if (!found) {
      throw new Error(`missing token for ${username}`);
    }
    return found;
  }
});
