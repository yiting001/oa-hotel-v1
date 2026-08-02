import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 合同审批单补充采购需求字段：乙方联系人/电话、付款方式、有效期与备注。 */
export class ContractApprovalProcurementFields1784900000000 implements MigrationInterface {
  name = 'ContractApprovalProcurementFields1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "counterpartyContact" text`);
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "counterpartyPhone" text`);
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "paymentMethod" text`);
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "validFrom" text`);
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "validTo" text`);
    await queryRunner.query(`ALTER TABLE "contracts" ADD COLUMN "remark" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "remark"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "validTo"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "validFrom"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "paymentMethod"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "counterpartyPhone"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP COLUMN "counterpartyContact"`);
  }
}
