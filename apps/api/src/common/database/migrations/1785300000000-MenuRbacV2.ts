import { DEFAULT_MENUS } from '@oa/contracts';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 标准 RBAC 菜单管理：菜单树表 + 角色-菜单授权表，替换按角色隐藏菜单的旧方案。 */
export class MenuRbacV21785300000000 implements MigrationInterface {
  name = 'MenuRbacV21785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "iam_menus" ("id" text PRIMARY KEY NOT NULL, "parentId" text, "name" text NOT NULL, "type" text NOT NULL, "path" text, "permissionCode" text, "icon" text, "orderNum" integer NOT NULL DEFAULT (0), "visible" boolean NOT NULL DEFAULT (1), "active" boolean NOT NULL DEFAULT (1))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_iam_menus_parentId" ON "iam_menus" ("parentId")`);
    await queryRunner.query(
      `CREATE TABLE "iam_role_menus" ("roleId" text NOT NULL, "menuId" text NOT NULL, PRIMARY KEY ("roleId", "menuId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_role_menus_menuId" ON "iam_role_menus" ("menuId")`,
    );
    for (const menu of DEFAULT_MENUS) {
      await queryRunner.query(
        `INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          menu.id,
          menu.parentId,
          menu.name,
          menu.type,
          menu.path,
          menu.permissionCode,
          menu.icon,
          menu.orderNum,
          menu.visible ? 1 : 0,
          menu.active ? 1 : 0,
        ],
      );
    }
    await queryRunner.query(
      `INSERT INTO "iam_role_menus" ("roleId", "menuId") SELECT r."id", m."id" FROM "iam_roles" r CROSS JOIN "iam_menus" m`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "iam_role_hidden_menus"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "iam_role_menus"`);
    await queryRunner.query(`DROP TABLE "iam_menus"`);
    await queryRunner.query(
      `CREATE TABLE "iam_role_hidden_menus" ("roleId" text NOT NULL, "menuId" text NOT NULL, PRIMARY KEY ("roleId", "menuId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_role_hidden_menus_menuId" ON "iam_role_hidden_menus" ("menuId")`,
    );
  }
}
