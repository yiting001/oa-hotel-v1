import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 印章使用申请：公章外带时补充归还日期。 */
export class PostgresSealUseReturnDate1787300000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "seal_use_requests" ADD COLUMN "plannedReturnDate" text`,
    );
  }

  async down(): Promise<void> {
    // 保留列以支持历史单据展示。
  }
}
