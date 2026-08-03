#!/usr/bin/env node
/**
 * 把现有 SQLite 数据迁移到 PostgreSQL。
 *
 * 用法（先构建 @oa/api，使 dist 存在）：
 *   OA_SQLITE_PATH=/path/to/oa.sqlite \
 *   OA_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/oa_hotel \
 *   node scripts/migrate-sqlite-to-postgres.mjs
 *
 * 目标库必须已经跑过 PostgreSQL 迁移（应用启动一次即可）。
 * 脚本会清空目标库中对应表后按源库数据重新写入。
 */
import console from 'node:console';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { DataSource } = require('typeorm');
const { databaseEntities } = require('../dist/common/database/entities.js');

const sqlitePath = process.env.OA_SQLITE_PATH;
const postgresUrl = process.env.OA_DATABASE_URL;
if (!sqlitePath || !postgresUrl) {
  console.error('OA_SQLITE_PATH 和 OA_DATABASE_URL 都必须设置');
  process.exit(1);
}

// 源库用裸连接读取（实体列类型按 OA_DATABASE_URL 解析为 PG 方言，不能复用）
const source = new DataSource({
  type: 'better-sqlite3',
  database: sqlitePath,
  entities: [],
  readonly: true,
});
const target = new DataSource({
  type: 'postgres',
  url: postgresUrl,
  entities: databaseEntities,
});

await source.initialize();
await target.initialize();

const queryRunner = target.createQueryRunner();
await queryRunner.connect();
await queryRunner.query("SET session_replication_role = 'replica'");
try {
  for (const entity of databaseEntities) {
    const metadata = target.getMetadata(entity);
    const table = metadata.tableName;
    let rows;
    try {
      rows = await source.query(`SELECT * FROM "${table}"`);
    } catch (error) {
      console.warn(`${table}: 源库读取失败，跳过（${error.message}）`);
      continue;
    }
    await queryRunner.query(`DELETE FROM "${table}"`);
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const booleanColumns = new Set(
        metadata.columns
          .filter((column) => column.type === 'boolean' || column.type === Boolean)
          .map((column) => column.databaseName),
      );
      const columnList = columns.map((column) => `"${column}"`).join(', ');
      for (const row of rows) {
        const values = columns.map((column) =>
          booleanColumns.has(column) && row[column] !== null ? Boolean(row[column]) : row[column],
        );
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        await queryRunner.query(
          `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders})`,
          values,
        );
      }
    }
    console.log(`${table}: ${rows.length} rows`);
  }
} finally {
  await queryRunner.query("SET session_replication_role = 'origin'");
  await queryRunner.release();
  await source.destroy();
  await target.destroy();
}
console.log('迁移完成');
