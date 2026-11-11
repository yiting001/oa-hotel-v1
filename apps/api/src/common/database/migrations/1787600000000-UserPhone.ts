import type { MigrationInterface, QueryRunner } from 'typeorm';

/** 用户手机号：既作为联系方式保存，也可作为登录账号使用。 */
export class UserPhone1787600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "phone" text`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone"`);
  }
}
