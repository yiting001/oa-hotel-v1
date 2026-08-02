import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Aligns untouched roster accounts with the hotel's optional self-service password policy. */
export class RosterOptionalPasswordChange1784700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users"
       SET "passwordChangeRequired" = 0
       WHERE substr("id", 1, 12) = 'roster-user-'
         AND length("id") = 36
         AND "passwordChangeRequired" = 1
         AND "passwordChangedAt" IS NULL
         AND "credentialVersion" = 0`,
    );
  }

  async down(): Promise<void> {
    throw new Error('花名册可选改密策略是前向数据迁移；回滚请恢复迁移前的 SQLite 备份');
  }
}
