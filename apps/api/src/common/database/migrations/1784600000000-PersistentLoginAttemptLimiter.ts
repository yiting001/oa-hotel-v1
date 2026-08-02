import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Persists account-level login throttling across API process restarts. */
export class PersistentLoginAttemptLimiter1784600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "login_attempt_states" (
        "username" text PRIMARY KEY NOT NULL,
        "generation" text NOT NULL,
        "attempts" integer NOT NULL,
        "expiresAt" datetime NOT NULL,
        "updatedAt" datetime NOT NULL,
        CONSTRAINT "CHK_login_attempt_attempts_positive" CHECK ("attempts" > 0)
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_login_attempt_expires_at" ON "login_attempt_states" ("expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_login_attempt_expires_at"`);
    await queryRunner.query(`DROP TABLE "login_attempt_states"`);
  }
}
