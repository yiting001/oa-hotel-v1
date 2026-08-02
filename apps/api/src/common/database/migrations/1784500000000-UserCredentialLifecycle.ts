import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds revocable credential state without forcing existing accounts to change their password. */
export class UserCredentialLifecycle1784500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "passwordChangeRequired" boolean NOT NULL DEFAULT (0)`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "passwordChangedAt" datetime`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "credentialVersion" integer NOT NULL DEFAULT (0)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "credentialVersion"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordChangedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordChangeRequired"`);
  }
}
