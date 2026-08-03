import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 审批中心独立路由 /approval，与个人工作台职责拆分。 */
export class ApprovalCenterPath1785700000000 implements MigrationInterface {
  name = 'ApprovalCenterPath1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "iam_menus" SET "path" = '/approval' WHERE "id" = 'menu-approval'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "iam_menus" SET "path" = '/workbench?tab=pending' WHERE "id" = 'menu-approval'`,
    );
  }
}
