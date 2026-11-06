import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hash } from 'argon2';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  number: string;
}

interface Task {
  id: string;
  documentId: string;
  assigneeRole: string;
}

describe('首批业务模块集成流程', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  const tokens = new Map<string, string>();

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    process.env.OA_STORAGE_PATH = mkdtempSync(join(tmpdir(), 'oa-api-test-'));
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    await seedGenericDocumentUser();
    await seedLegalAdvisorUser();
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
      'initiator',
      'generic',
      'lawyer',
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
    // 关联请示不再要求已审批：本人尚未提交的草稿请示也可以先关联到合同审批
    const draftRequestContract = await post<Envelope<CreatedDocument>>('applicant', '/contracts', {
      requestId: requestDocument.data.id,
      signingDepartmentId: 'dept-business',
      signingDate: '2026-07-11',
      name: '草稿请示关联测试',
      amountCents: 500000,
      counterpartyFullName: '上海示例维保有限公司',
      contentReason: '验证草稿请示可以先行关联',
      sealType: null,
      attachments: [],
    });
    expect(draftRequestContract.data.number).toMatch(/^[A-Z]{2,8}\d{8}-\d{3}$/);

    await submit('applicant', requestDocument.data.id);
    let task = await taskFor('manager', requestDocument.data.id);
    await request(server)
      .post(`/api/v1/workflow/tasks/${task.id}/return`)
      .auth(token('manager'), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID(), comment: '补充预算说明' })
      .expect(201);
    await submit('applicant', requestDocument.data.id);
    task = await taskFor('manager', requestDocument.data.id);
    await approve('manager', task.id);
    // 部门负责人之后由办公室勾选下一步部门（财务部），部门审核完成后直接送主管领导
    task = await taskFor('office', requestDocument.data.id);
    await approveWithChoices('office', task.id, ['finance-dept']);
    task = await taskFor('finance', requestDocument.data.id);
    await approve('finance', task.id);
    task = await taskFor('execpre', requestDocument.data.id);
    await approve('execpre', task.id);

    const contract = await post<Envelope<CreatedDocument>>('applicant', '/contracts', {
      requestId: requestDocument.data.id,
      signingDepartmentId: 'dept-business',
      signingDate: '2026-07-11',
      name: '空调维保合同',
      amountCents: 500000,
      counterpartyFullName: '上海示例维保有限公司',
      contentReason: '年度维保服务',
      sealType: 'CONTRACT_SEAL',
      attachments: [],
    });
    await submit('applicant', contract.data.id);
    task = await firstTask('manager');
    await approve('manager', task.id);

    // 行政审批人先指派外部律师：分支办结后回到行政，再由行政送主管领导与总经理。
    task = await firstTask('adminapprove');
    await approveWithChoices('adminapprove', task.id, ['external-lawyer']);
    const lawyerTask = await firstTask('lawyer');
    await approve('lawyer', lawyerTask.id);
    task = await firstTask('adminapprove');
    await approve('adminapprove', task.id);

    task = await firstTask('execpre');
    await approve('execpre', task.id);
    task = await firstTask('exec');
    await approve('exec', task.id);

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

  it('requires a return date when the official seal is taken out', async () => {
    const missingDate = await request(server)
      .post('/api/v1/seals/use-requests')
      .auth(token('applicant'), { type: 'bearer' })
      .send({
        useDate: '2026-10-29',
        purpose: '外带用印',
        sealAssetNames: ['公章'],
        sealCategories: [{ name: '公章', copies: 1 }],
        sealTakeout: true,
        content: '外带用印测试',
        attachments: [],
      });
    expect(missingDate.status).toBe(422);
    expect(missingDate.body.code).toBe('SEAL_RETURN_DATE_REQUIRED');

    const created = await post<Envelope<CreatedDocument>>('applicant', '/seals/use-requests', {
      useDate: '2026-10-29',
      plannedReturnDate: '2026-10-30',
      purpose: '外带用印',
      sealAssetNames: ['公章'],
      sealCategories: [{ name: '公章', copies: 1 }],
      sealTakeout: true,
      content: '外带用印测试',
      attachments: [],
    });
    expect(created.data).toMatchObject({ plannedReturnDate: '2026-10-30' });
  });

  it('starts purchase approval with procurement instead of the vice president', async () => {
    // 采购发起人角色拥有 PURCHASE_CREATE
    const purchase = await post<Envelope<CreatedDocument>>('initiator', '/purchases', {
      name: '采购链路测试',
      items: [{ name: 'A4 复印纸', unit: '箱', quantity: 1, unitPriceCents: 100 }],
      attachments: [],
    });
    await submit('initiator', purchase.data.id);

    const procurementTask = await taskFor('procurement', purchase.data.id);
    expect(procurementTask).toMatchObject({ assigneeRole: 'PROCUREMENT' });

    const execPreTasks = await request(server)
      .get('/api/v1/workflow/tasks')
      .auth(token('execpre'), { type: 'bearer' })
      .expect(200);
    expect((execPreTasks.body as Task[]).some((task) => task.documentId === purchase.data.id)).toBe(
      false,
    );
  });

  it('returns purchase approval to the previous procurement step so prices can be supplemented', async () => {
    const purchase = await post<Envelope<CreatedDocument>>('initiator', '/purchases', {
      name: '采购退回补充价格测试',
      items: [{ name: 'A4 复印纸', unit: '箱', quantity: 2, unitPriceCents: 0 }],
      attachments: [],
    });
    await submit('initiator', purchase.data.id);

    const procurementTask = await taskFor('procurement', purchase.data.id);
    await approve('procurement', procurementTask.id);

    const financeTask = await taskFor('finance', purchase.data.id);
    expect(financeTask.assigneeRole).toBe('FINANCE_REVIEWER');
    // 财务不是采购经办，不能越权补价格
    await request(server)
      .put(`/api/v1/purchases/${purchase.data.id}/approval`)
      .auth(token('finance'), { type: 'bearer' })
      .send({
        items: [{ name: 'A4 复印纸', unit: '箱', quantity: 2, unitPriceCents: 2500 }],
        attachments: [],
      })
      .expect(403);

    await request(server)
      .post(`/api/v1/workflow/tasks/${financeTask.id}/return`)
      .auth(token('finance'), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID(), comment: '需补充附件及价格' })
      .expect(201);

    const returned = await request(server)
      .get(`/api/v1/purchases/${purchase.data.id}`)
      .auth(token('initiator'), { type: 'bearer' })
      .expect(200);
    expect(returned.body.document).toMatchObject({ status: 'IN_REVIEW', currentStep: 0 });

    const procurementAgain = await taskFor('procurement', purchase.data.id);
    expect(procurementAgain.assigneeRole).toBe('PROCUREMENT');

    const procurementDetail = await request(server)
      .get(`/api/v1/purchases/${purchase.data.id}`)
      .auth(token('procurement'), { type: 'bearer' })
      .expect(200);
    expect(procurementDetail.body.data.canModerate).toBe(true);

    const uploaded = await request(server)
      .post(`/api/v1/purchases/${purchase.data.id}/approval/attachments`)
      .auth(token('procurement'), { type: 'bearer' })
      .attach('file', Buffer.from('补充价格说明'), 'price-note.txt')
      .expect(201);
    expect(uploaded.body.fileName).toBe('price-note.txt');
    await request(server)
      .post(`/api/v1/purchases/${purchase.data.id}/approval/attachments`)
      .auth(token('finance'), { type: 'bearer' })
      .attach('file', Buffer.from('x'), 'x.txt')
      .expect(403);

    const supplemented = await request(server)
      .put(`/api/v1/purchases/${purchase.data.id}/approval`)
      .auth(token('procurement'), { type: 'bearer' })
      .send({
        items: [
          {
            name: 'A4 复印纸',
            specification: '',
            unit: '箱',
            quantity: 2,
            unitPriceCents: 2500,
          },
        ],
        attachments: [{ id: uploaded.body.id, fileName: uploaded.body.fileName }],
      })
      .expect(200);
    expect(supplemented.body.data).toMatchObject({ amountCents: 5000, subtotalCents: 5000 });
    expect(supplemented.body.data.attachments[0]).toMatchObject({
      id: uploaded.body.id,
      fileName: 'price-note.txt',
    });
    expect(supplemented.body.data.items[0]).toMatchObject({
      unitPriceCents: 2500,
      subtotalCents: 5000,
    });

    await approve('procurement', procurementAgain.id);
    const financeAgain = await taskFor('finance', purchase.data.id);
    expect(financeAgain.assigneeRole).toBe('FINANCE_REVIEWER');
  });

  it('returns a first-step purchase approval back to the applicant', async () => {
    const purchase = await post<Envelope<CreatedDocument>>('initiator', '/purchases', {
      name: '采购首节点退回测试',
      items: [{ name: '签字笔', unit: '盒', quantity: 1, unitPriceCents: 500 }],
      attachments: [],
    });
    await submit('initiator', purchase.data.id);

    const procurementTask = await taskFor('procurement', purchase.data.id);
    await request(server)
      .post(`/api/v1/workflow/tasks/${procurementTask.id}/return`)
      .auth(token('procurement'), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID(), comment: '请补充采购说明' })
      .expect(201);

    const returned = await request(server)
      .get(`/api/v1/purchases/${purchase.data.id}`)
      .auth(token('initiator'), { type: 'bearer' })
      .expect(200);
    expect(returned.body.document).toMatchObject({ status: 'RETURNED', currentStep: null });

    await request(server)
      .patch(`/api/v1/purchases/${purchase.data.id}`)
      .auth(token('initiator'), { type: 'bearer' })
      .send({
        name: '采购首节点退回测试',
        items: [{ name: '签字笔', unit: '盒', quantity: 1, unitPriceCents: 600 }],
        attachments: [],
      })
      .expect(200);
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

  /** 外部律师：合同审批中由行政办公室指派的分支审核人。 */
  async function seedLegalAdvisorUser(): Promise<void> {
    const users = app.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    const iam = app.get(IamService);
    const permissions = await iam.listPermissions();
    const approvalPermissions = permissions
      .filter(
        (item) =>
          item.code === 'WORKFLOW_APPROVE' ||
          item.code === 'DOCUMENT_VIEW' ||
          item.code.startsWith('CONTRACT_'),
      )
      .map((item) => item.id);
    const role =
      (await iam.listRoles()).find((item) => item.code === 'LEGAL_ADVISOR') ??
      (await iam.createRole({ code: 'LEGAL_ADVISOR', name: '外部律师' }));
    await iam.updateRolePermissions(role.id, approvalPermissions);
    await users.save({
      id: 'user-lawyer',
      username: 'lawyer',
      displayName: '外部律师',
      passwordHash: await hash('Demo123!'),
      departmentId: 'dept-office',
      roleCodes: [],
      active: true,
    });
    await iam.updateUserAssignments('user-lawyer', {
      memberships: [{ departmentId: 'dept-office', isPrimary: true }],
      roles: [{ roleId: role.id, dataScope: DataScope.ALL }],
    });
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

  async function approveWithChoices(
    username: string,
    taskId: string,
    choices: string[],
  ): Promise<void> {
    await request(server)
      .post(`/api/v1/workflow/tasks/${taskId}/approve`)
      .auth(token(username), { type: 'bearer' })
      .send({ requestId: crypto.randomUUID(), comment: '指派审核', choices })
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

  async function taskFor(username: string, documentId: string): Promise<Task> {
    const response = await request(server)
      .get('/api/v1/workflow/tasks')
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    const task = (response.body as Task[]).find((item) => item.documentId === documentId);
    expect(task, `待办不存在: ${username} / ${documentId}`).toBeDefined();
    return task as Task;
  }

  function token(username: string): string {
    const found = tokens.get(username);
    if (!found) {
      throw new Error(`missing token for ${username}`);
    }
    return found;
  }
});
