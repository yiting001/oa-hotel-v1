import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 合同审批的「是否需要用印」改为「用印选择」（合同章/公章），保留旧开关列用于历史表单重放。 */
export class PostgresContractSealType1787000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "sealType" text`);
  }

  async down(): Promise<void> {
    // 保留字段以支持历史单据展示。
  }
}
