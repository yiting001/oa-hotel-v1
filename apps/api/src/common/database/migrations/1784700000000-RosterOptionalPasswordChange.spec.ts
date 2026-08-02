import { DataSource, type QueryRunner } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RosterOptionalPasswordChange1784700000000 } from './1784700000000-RosterOptionalPasswordChange';

describe('RosterOptionalPasswordChange1784700000000', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeEach(async () => {
    dataSource = new DataSource({ type: 'better-sqlite3', database: ':memory:' });
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" text PRIMARY KEY NOT NULL,
        "passwordChangeRequired" boolean NOT NULL,
        "passwordChangedAt" datetime,
        "credentialVersion" integer NOT NULL
      )`,
    );
  });

  afterEach(async () => {
    await queryRunner.release();
    await dataSource.destroy();
  });

  it('only releases untouched roster accounts from mandatory password change', async () => {
    await insertUser('roster-user-aaaaaaaaaaaaaaaaaaaaaaaa', true, null, 0);
    await insertUser('roster-user-bbbbbbbbbbbbbbbbbbbbbbbb', true, '2026-07-21', 1);
    await insertUser('manual-user', true, null, 0);
    await insertUser('roster-user-cccccccccccccccccccccccc', false, null, 0);

    await new RosterOptionalPasswordChange1784700000000().up(queryRunner);

    expect(await passwordPolicyByUser()).toEqual({
      'manual-user': 1,
      'roster-user-aaaaaaaaaaaaaaaaaaaaaaaa': 0,
      'roster-user-bbbbbbbbbbbbbbbbbbbbbbbb': 1,
      'roster-user-cccccccccccccccccccccccc': 0,
    });
  });

  it('requires restoring the pre-migration backup for rollback', async () => {
    await expect(new RosterOptionalPasswordChange1784700000000().down()).rejects.toThrowError(
      '恢复迁移前的 SQLite 备份',
    );
  });

  async function insertUser(
    id: string,
    passwordChangeRequired: boolean,
    passwordChangedAt: string | null,
    credentialVersion: number,
  ): Promise<void> {
    await queryRunner.query(`INSERT INTO "users" VALUES (?, ?, ?, ?)`, [
      id,
      passwordChangeRequired ? 1 : 0,
      passwordChangedAt,
      credentialVersion,
    ]);
  }

  async function passwordPolicyByUser(): Promise<Record<string, number>> {
    const rows = (await queryRunner.query(
      `SELECT "id", "passwordChangeRequired" FROM "users" ORDER BY "id"`,
    )) as Array<{ id: string; passwordChangeRequired: number }>;
    return Object.fromEntries(rows.map((row) => [row.id, row.passwordChangeRequired]));
  }
});
