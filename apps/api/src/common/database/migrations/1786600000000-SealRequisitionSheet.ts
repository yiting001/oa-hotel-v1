import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['seal_use_requests', 'seal_borrow_requests'] as const;

/** 印章证照按线下《用印及借用证照申请单》补充报送单位、用章类别数量与外带标记。 */
export class SealRequisitionSheet1786600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "submitTo" text NOT NULL DEFAULT ''`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "sealCategories" text NOT NULL DEFAULT '[]'`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "sealTakeout" boolean NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "licenseTakeout" boolean NOT NULL DEFAULT 0`,
      );
    }
  }

  async down(): Promise<void> {
    // 保留字段以支持历史单据展示。
  }
}
