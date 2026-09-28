import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 内部请示按线下单子补充「致送」「发出」。 */
export class PostgresContractRequestAddressee1786400000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contract_requests" ADD COLUMN "addressee" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_requests" ADD COLUMN "issuer" text NOT NULL DEFAULT ''`,
    );
  }

  async down(): Promise<void> {
    // 保留字段以支持历史单据展示。
  }
}
