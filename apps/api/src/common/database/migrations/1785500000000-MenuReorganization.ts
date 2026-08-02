import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 菜单结构调整：平台管理更名系统设置，内容管理/零星采买物资库归入业务中心，操作日志归入系统设置，移除发起申请快捷菜单。 */
export class MenuReorganization1785500000000 implements MigrationInterface {
  name = 'MenuReorganization1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "iam_menus" SET "name" = '系统设置' WHERE "id" = 'menu-platform' AND "name" = '平台管理'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "parentId" = 'menu-business', "orderNum" = 6 WHERE "id" = 'menu-content'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "parentId" = 'menu-business', "orderNum" = 7 WHERE "id" = 'menu-petty-materials'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "parentId" = 'menu-platform', "orderNum" = 5 WHERE "id" = 'menu-insight-logs'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = 2 WHERE "id" = 'menu-insight-statistics'`,
    );
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 1 WHERE "id" = 'menu-iam'`);
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 2 WHERE "id" = 'menu-menus'`);
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 3 WHERE "id" = 'menu-processes'`);
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = 4 WHERE "id" = 'menu-approval-chains'`,
    );
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 6 WHERE "id" = 'menu-forms'`);
    await queryRunner.query(`DELETE FROM "iam_role_menus" WHERE "menuId" = 'menu-start'`);
    await queryRunner.query(`DELETE FROM "iam_menus" WHERE "id" = 'menu-start'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES ('menu-start', 'menu-office', '发起申请', 'MENU', '/start', NULL, 'EditPen', 4, 1, 1)`,
    );
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_role_menus" ("roleId", "menuId") SELECT r."id", 'menu-start' FROM "iam_roles" r`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "name" = '平台管理' WHERE "id" = 'menu-platform' AND "name" = '系统设置'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "parentId" = 'menu-platform', "orderNum" = 1 WHERE "id" = 'menu-content'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "parentId" = 'menu-platform', "orderNum" = 4 WHERE "id" = 'menu-petty-materials'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "parentId" = 'menu-insight', "orderNum" = 2 WHERE "id" = 'menu-insight-logs'`,
    );
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = 3 WHERE "id" = 'menu-insight-statistics'`,
    );
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 2 WHERE "id" = 'menu-iam'`);
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 3 WHERE "id" = 'menu-menus'`);
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 5 WHERE "id" = 'menu-processes'`);
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = 6 WHERE "id" = 'menu-approval-chains'`,
    );
    await queryRunner.query(`UPDATE "iam_menus" SET "orderNum" = 7 WHERE "id" = 'menu-forms'`);
  }
}
