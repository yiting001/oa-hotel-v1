import { afterEach, describe, expect, it, vi } from 'vitest';

const originalDatabaseUrl = process.env.OA_DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.OA_DATABASE_URL;
  else process.env.OA_DATABASE_URL = originalDatabaseUrl;
  vi.resetModules();
});

describe('DATETIME_COLUMN_TYPE', () => {
  it('PostgreSQL 使用带时区的时间列，避免进程时区与数据库会话时区叠加', async () => {
    process.env.OA_DATABASE_URL = 'postgresql://oa:secret@db:5432/oa';
    vi.resetModules();
    const { DATETIME_COLUMN_TYPE } = await import('./column-types');
    expect(DATETIME_COLUMN_TYPE).toBe('timestamp with time zone');
  });

  it('SQLite 继续使用 datetime（驱动已按 UTC 存字符串）', async () => {
    delete process.env.OA_DATABASE_URL;
    vi.resetModules();
    const { DATETIME_COLUMN_TYPE } = await import('./column-types');
    expect(DATETIME_COLUMN_TYPE).toBe('datetime');
  });
});
