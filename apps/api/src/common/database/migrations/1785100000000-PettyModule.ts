import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 零星采买（LX）业务表：物资库、采买单、采买明细与明细变更日志。 */
export class PettyModule1785100000000 implements MigrationInterface {
  name = 'PettyModule1785100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "petty_materials" ("id" text PRIMARY KEY NOT NULL, "name" text NOT NULL, "brand" text NOT NULL, "unit" text NOT NULL DEFAULT (''), "unitPriceCents" integer NOT NULL, "supplierName" text NOT NULL, "supplierContact" text, "supplierPhone" text, "active" boolean NOT NULL DEFAULT (1))`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_procurements" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "title" text NOT NULL, "totalAmountCents" integer NOT NULL, "remark" text, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_petty_procurements_number" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_procurement_items" ("id" text PRIMARY KEY NOT NULL, "procurementId" text NOT NULL, "materialId" text NOT NULL, "name" text NOT NULL, "brand" text NOT NULL, "unit" text NOT NULL DEFAULT (''), "unitPriceCents" integer NOT NULL, "quantity" integer NOT NULL, "subtotalCents" integer NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_change_logs" ("id" text PRIMARY KEY NOT NULL, "procurementId" text NOT NULL, "actorId" text NOT NULL, "actorName" text NOT NULL, "action" text NOT NULL, "detail" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "petty_change_logs"`);
    await queryRunner.query(`DROP TABLE "petty_procurement_items"`);
    await queryRunner.query(`DROP TABLE "petty_procurements"`);
    await queryRunner.query(`DROP TABLE "petty_materials"`);
  }
}
