import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { DocumentWorkflowService } from '../workflow/application/document-workflow.service';
import { WorkflowCopyService } from '../workflow/application/workflow-copy.service';
import { DocumentFollowService } from '../workbench/application/document-follow.service';
import { ContractApplicationService } from '../../modules/contract/application/contract-application.service';
import { SealApplicationService } from '../../modules/seal/application/seal-application.service';
import { SupplyApplicationService } from '../../modules/supply/application/supply-application.service';
import { assertDemoDataSeedAllowed, DemoDataSeeder } from './demo-data.seeder';

async function seedDemoData(): Promise<void> {
  // Guard before importing AppModule so a rejected command cannot initialize a database connection.
  assertDemoDataSeedAllowed(process.env);
  const { AppModule } = await import('../../app.module');
  const context = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const seeder = new DemoDataSeeder(
      context.get(DataSource),
      context.get(AuthService),
      context.get(DocumentWorkflowService),
      context.get(ContractApplicationService),
      context.get(SealApplicationService),
      context.get(SupplyApplicationService),
      context.get(DocumentFollowService),
      context.get(WorkflowCopyService),
    );
    const summary = await seeder.seed();
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await context.close();
  }
}

void seedDemoData().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`演示数据初始化失败：${message}\n`);
  process.exitCode = 1;
});
