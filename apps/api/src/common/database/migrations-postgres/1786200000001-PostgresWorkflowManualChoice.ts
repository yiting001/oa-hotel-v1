import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
  applyBusinessMenuRestructure,
  applyManualChoiceChainAdjustment,
  applyPettyRequesterRestriction,
} from '../hotel-approval-chain-2026';

/**
 * 平台新增「人工选择下一步」：待办记录节点类型与分支来源，
 * 并按新的链路重新发布请示批复与合同审批流程。
 */
export class PostgresWorkflowManualChoice1786200000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD COLUMN "nodeKind" text NOT NULL DEFAULT 'APPROVAL'`,
    );
    await queryRunner.query(`ALTER TABLE "workflow_tasks" ADD COLUMN "originTaskId" text`);
    await queryRunner.query(`ALTER TABLE "workflow_tasks" ADD COLUMN "branchLabel" text`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workflow_tasks_originTaskId" ON "workflow_tasks" ("originTaskId")`,
    );
    await applyManualChoiceChainAdjustment(queryRunner, 'postgres');
    await applyPettyRequesterRestriction(queryRunner, 'postgres');
    await applyBusinessMenuRestructure(queryRunner, 'postgres');
  }

  async down(): Promise<void> {
    // 已发布的流程版本不可回退，字段保留以支持历史待办显示。
  }
}
