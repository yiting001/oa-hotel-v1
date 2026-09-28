import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 零星采买按线下《餐饮食品原材料请购单》补充班组、日期与明细的要求/备注。 */
export class PostgresPettyRequisitionSheet1786500000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "petty_procurements" ADD COLUMN "teamName" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "petty_procurements" ADD COLUMN "applicationDate" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "petty_procurement_items" ADD COLUMN "requirement" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "petty_procurement_items" ADD COLUMN "remark" text NOT NULL DEFAULT ''`,
    );
  }

  async down(): Promise<void> {
    // 保留字段以支持历史单据展示。
  }
}
