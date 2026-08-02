import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 审批链路配置并入审批流程设计页（标签页），移除独立菜单。 */
export class MergeApprovalChainMenu1785600000000 implements MigrationInterface {
  name = 'MergeApprovalChainMenu1785600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "iam_role_menus" WHERE "menuId" = 'menu-approval-chains'`);
    await queryRunner.query(`DELETE FROM "iam_menus" WHERE "id" = 'menu-approval-chains'`);
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = 4 WHERE "id" = 'menu-insight-logs' AND "parentId" = 'menu-platform'`,
    );
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 5 WHERE "id" = 'menu-forms'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES ('menu-approval-chains', 'menu-platform', '审批链路配置', 'MENU', '/system/approval-chains', 'PROCESS_DESIGN_VIEW', 'Connection', 4, 1, 1)`,
    );
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_role_menus" ("roleId", "menuId") SELECT r."id", 'menu-approval-chains' FROM "iam_roles" r`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = 5 WHERE "id" = 'menu-insight-logs' AND "parentId" = 'menu-platform'`,
    );
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 6 WHERE "id" = 'menu-forms'`);
  }
}
