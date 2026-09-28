import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 采购审批按线下《采购申请单》补充明细表、类别勾选、费用构成与供应商报价。 */
export class PostgresPurchaseRequisitionSheet1786700000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "purchase_items" (
        "id" text PRIMARY KEY,
        "purchaseId" text NOT NULL,
        "name" text NOT NULL,
        "specification" text NOT NULL DEFAULT '',
        "unit" text NOT NULL DEFAULT '',
        "quantity" integer NOT NULL DEFAULT 1,
        "unitPriceCents" integer NOT NULL DEFAULT 0,
        "subtotalCents" integer NOT NULL DEFAULT 0
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_purchase_items_purchaseId" ON "purchase_items" ("purchaseId")`,
    );
    const columns: Array<[string, string]> = [
      ['itemCategory', `text NOT NULL DEFAULT 'NON_STOCK'`],
      ['budgetType', `text NOT NULL DEFAULT 'NONE'`],
      ['subtotalCents', `integer NOT NULL DEFAULT 0`],
      ['tariffCents', `integer NOT NULL DEFAULT 0`],
      ['vatCents', `integer NOT NULL DEFAULT 0`],
      ['otherFeesCents', `integer NOT NULL DEFAULT 0`],
      ['reason', `text NOT NULL DEFAULT ''`],
      ['handlerName', `text NOT NULL DEFAULT ''`],
      ['supplierA', `text NOT NULL DEFAULT ''`],
      ['supplierB', `text NOT NULL DEFAULT ''`],
      ['supplierC', `text NOT NULL DEFAULT ''`],
      ['requiredDate', `text`],
      ['purchaseOrderNo', `text NOT NULL DEFAULT ''`],
    ];
    for (const [name, definition] of columns) {
      await queryRunner.query(`ALTER TABLE "purchases" ADD COLUMN "${name}" ${definition}`);
    }
  }

  async down(): Promise<void> {
    // 保留字段与明细表以支持历史单据展示。
  }
}
