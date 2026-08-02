import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 采购审批（CG）业务表。 */
export class PurchaseModule1785000000000 implements MigrationInterface {
  name = 'PurchaseModule1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "purchases" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "name" text NOT NULL, "amountCents" integer NOT NULL, "counterpartyName" text NOT NULL, "counterpartyContact" text, "counterpartyPhone" text, "paymentMethod" text, "expectedDeliveryDate" text, "remark" text, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_purchases_number" UNIQUE ("number"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "purchases"`);
  }
}
