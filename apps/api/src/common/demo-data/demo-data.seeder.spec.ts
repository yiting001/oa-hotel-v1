import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { DocumentWorkflowService } from '../workflow/application/document-workflow.service';
import { WorkflowCopyService } from '../workflow/application/workflow-copy.service';
import { DocumentFollowService } from '../workbench/application/document-follow.service';
import { WorkbenchQueryService } from '../workbench/application/workbench-query.service';
import { DocumentIndexEntity } from '../workflow/infrastructure/document-index.entity';
import { ContractApplicationService } from '../../modules/contract/application/contract-application.service';
import { ContractPaymentEntity } from '../../modules/contract/infrastructure/contract-payment.entity';
import { SealApplicationService } from '../../modules/seal/application/seal-application.service';
import { SupplyApplicationService } from '../../modules/supply/application/supply-application.service';
import { DEMO_SCENARIOS } from './demo-data.catalog';
import { assertDemoDataSeedAllowed, DemoDataSeeder } from './demo-data.seeder';

describe('DemoDataSeeder', () => {
  let context: INestApplicationContext;
  let dataSource: DataSource;
  let auth: AuthService;
  let workflow: DocumentWorkflowService;
  let seeder: DemoDataSeeder;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    process.env.OA_DEMO_SEED = 'true';
    process.env.JWT_SECRET = 'demo-seed-test-secret';
    const { AppModule } = await import('../../app.module');
    context = await NestFactory.createApplicationContext(AppModule, { logger: false });
    dataSource = context.get(DataSource);
    auth = context.get(AuthService);
    workflow = context.get(DocumentWorkflowService);
    seeder = new DemoDataSeeder(
      dataSource,
      auth,
      workflow,
      context.get(ContractApplicationService),
      context.get(SealApplicationService),
      context.get(SupplyApplicationService),
      context.get(DocumentFollowService),
      context.get(WorkflowCopyService),
    );
  });

  afterAll(async () => {
    await context?.close();
    delete process.env.OA_DEMO_SEED;
  });

  it('requires explicit local opt-in and always rejects production', () => {
    expect(() => assertDemoDataSeedAllowed({ NODE_ENV: 'development' })).toThrow(
      'OA_DEMO_SEED=true',
    );
    expect(() =>
      assertDemoDataSeedAllowed({ NODE_ENV: 'production', OA_DEMO_SEED: 'true' }),
    ).toThrow('production');
  });

  it('creates representative workflow read models and is idempotent', async () => {
    const first = await seeder.seed();
    const second = await seeder.seed();
    const titles = DEMO_SCENARIOS.map((scenario) => scenario.title);
    const documents = await dataSource
      .getRepository(DocumentIndexEntity)
      .createQueryBuilder('document')
      .where('document.title IN (:...titles)', { titles })
      .getMany();

    expect(first.created).toBe(DEMO_SCENARIOS.length);
    expect(second).toMatchObject({ created: 0, reused: DEMO_SCENARIOS.length });
    expect(second.interactions).toEqual({ follows: 2, copies: 2 });
    expect(documents).toHaveLength(DEMO_SCENARIOS.length);
    expect(documents.every((document) => document.processVersionId !== null)).toBe(true);
    expect(new Set(documents.map((document) => document.processVersionId)).size).toBe(7);
    for (const scenario of DEMO_SCENARIOS) {
      const document = documents.find((candidate) => candidate.title === scenario.title);
      expect(document?.status).toBe(scenario.target.status);
      if (scenario.target.status === 'IN_REVIEW') {
        expect(document?.currentStep).toBe(scenario.target.currentStep);
      }
    }

    const approvedContract = documents.find(
      (document) => document.title === '[演示] 2026年度电梯维保合同',
    );
    const payment = await dataSource.getRepository(ContractPaymentEntity).findOneBy({
      project: '[演示] 2026年度电梯维保合同首期付款',
    });
    expect(payment?.contractId).toBe(approvedContract?.id);

    const applicant = await auth.getSessionUser('user-applicant');
    const office = await auth.getSessionUser('user-office');
    const procurement = await auth.getSessionUser('user-procurement');
    const warehouse = await auth.getSessionUser('user-warehouse');
    expect((await workflow.listMyDocuments(applicant)).map((item) => item.title)).toEqual(
      expect.arrayContaining(titles),
    );
    expect((await workflow.listTasks(office)).map((item) => item.documentTitle)).toContain(
      '印章证照使用：[演示] 暑期招聘材料盖章',
    );
    expect((await workflow.listCompletedTasks(office)).length).toBeGreaterThan(0);
    expect((await workflow.listTasks(procurement)).map((item) => item.documentTitle)).toContain(
      '物资申购：[演示] 客房雨伞等2项',
    );
    expect((await workflow.listTasks(warehouse)).map((item) => item.documentTitle)).toContain(
      '物资领用：[演示] 客房补充用品套装等1项',
    );
    const workbench = context.get(WorkbenchQueryService);
    expect((await workbench.getSummary(applicant)).counts.FOLLOWING).toBeGreaterThanOrEqual(1);
    expect((await workbench.getSummary(office)).counts.COPIED).toBeGreaterThanOrEqual(1);
  });
});
