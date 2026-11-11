import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * 真实 PostgreSQL 的时区回归用例。
 *
 * 复现场景：API 容器默认 TZ=UTC（node:20-bookworm 未设 TZ），数据库会话时区通常是
 * Asia/Shanghai。历史 `timestamp`（无时区）列在这种组合下读回会快 8 小时，
 * 工作台“更新时间”因此显示未来时间。用例只在显式提供一次性测试库时执行：
 *
 *   OA_TEST_POSTGRES_URL=postgresql://user@127.0.0.1:5432/oa_tz_test npx vitest run test/postgres-timestamptz.spec.ts
 *
 * 注意：用例会执行迁移并写入数据，务必指向可丢弃的测试库。
 */
const databaseUrl = process.env.OA_TEST_POSTGRES_URL;
const previousDatabaseUrl = process.env.OA_DATABASE_URL;

afterAll(() => {
  if (previousDatabaseUrl === undefined) delete process.env.OA_DATABASE_URL;
  else process.env.OA_DATABASE_URL = previousDatabaseUrl;
});

describe.skipIf(!databaseUrl)('PostgreSQL 时间列时区一致性', () => {
  it('写入后读回的 updatedAt 与真实时刻一致', async () => {
    process.env.OA_DATABASE_URL = databaseUrl;
    const { createDatabaseOptions } = await import('../src/common/database/database-options');
    const { DocumentIndexEntity } = await import(
      '../src/common/workflow/infrastructure/document-index.entity'
    );

    const dataSource = new DataSource(createDatabaseOptions({ migrationsRun: true }));
    await dataSource.initialize();
    try {
      const writtenAt = new Date();
      const id = randomUUID();
      await dataSource.getRepository(DocumentIndexEntity).insert({
        id,
        documentType: 'CONTRACT_APPROVAL',
        module: 'CONTRACT',
        title: `时区回归 ${id.slice(0, 8)}`,
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        status: 'DRAFT',
        workflowCode: 'CONTRACT_APPROVAL',
      });

      const [row] = await dataSource
        .getRepository(DocumentIndexEntity)
        .createQueryBuilder('document')
        .select('document.id', 'id')
        .addSelect('document.updatedAt', 'updatedAt')
        .where('document.id = :id', { id })
        .getRawMany<{ id: string; updatedAt: Date | string }>();

      const readBack = new Date(row.updatedAt);
      expect(Math.abs(readBack.getTime() - writtenAt.getTime())).toBeLessThan(5_000);

      const [column] = await dataSource.query<{ data_type: string }[]>(
        `SELECT data_type FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'document_indexes'
              AND column_name = 'updatedAt'`,
      );
      expect(column.data_type).toBe('timestamp with time zone');
    } finally {
      await dataSource.destroy();
    }
  }, 60_000);
});
