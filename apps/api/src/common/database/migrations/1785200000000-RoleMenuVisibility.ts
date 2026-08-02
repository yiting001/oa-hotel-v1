import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 菜单管理：按角色隐藏菜单的绑定表（默认全部可见）。 */
export class RoleMenuVisibility1785200000000 implements MigrationInterface {
  name = 'RoleMenuVisibility1785200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "iam_role_hidden_menus" ("roleId" text NOT NULL, "menuId" text NOT NULL, PRIMARY KEY ("roleId", "menuId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_role_hidden_menus_menuId" ON "iam_role_hidden_menus" ("menuId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "iam_role_hidden_menus"`);
  }
}
