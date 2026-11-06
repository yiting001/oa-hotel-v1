import type { MigrationInterface, QueryRunner } from 'typeorm';

const WITHOUT_TIME_ZONE = 'timestamp without time zone';
const WITH_TIME_ZONE = 'timestamp with time zone';

interface TimestampColumn {
  tableName: string;
  columnName: string;
}

/**
 * 把历史 `timestamp`（无时区）列统一改为 `timestamptz`。
 *
 * 根因：`timestamp` 列保存的是**数据库会话时区**的墙上时间，而 node-postgres 在写入和读取时
 * 都按 **Node 进程时区**换算。生产容器（node:20-bookworm）默认 UTC，数据库会话通常是
 * Asia/Shanghai，于是每个时间读回后都快 8 小时，工作台“更新时间”会出现未来时间。
 *
 * 转换时按数据库当前会话时区解释旧值（`AT TIME ZONE current_setting('TimeZone')`），
 * 因此无论部署过去是否踩到该问题，历史数据都会落到正确的绝对时刻，不需要额外改数据。
 */
export class PostgresTimestamptzDateColumns1787500000001 implements MigrationInterface {
  name = 'PostgresTimestamptzDateColumns1787500000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of await listColumns(queryRunner, WITHOUT_TIME_ZONE)) {
      // timestamp AT TIME ZONE tz → timestamptz；timestamptz AT TIME ZONE tz → timestamp。
      // 同一个表达式恰好双向可用，所以 down() 复用同一段转换。
      await queryRunner.query(
        `ALTER TABLE ${quote(column.tableName)}
           ALTER COLUMN ${quote(column.columnName)}
           TYPE timestamptz
           USING ${quote(column.columnName)} AT TIME ZONE current_setting('TimeZone')`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of await listColumns(queryRunner, WITH_TIME_ZONE)) {
      await queryRunner.query(
        `ALTER TABLE ${quote(column.tableName)}
           ALTER COLUMN ${quote(column.columnName)}
           TYPE timestamp
           USING ${quote(column.columnName)} AT TIME ZONE current_setting('TimeZone')`,
      );
    }
  }
}

async function listColumns(queryRunner: QueryRunner, dataType: string): Promise<TimestampColumn[]> {
  return queryRunner.query(
    `SELECT table_name AS "tableName", column_name AS "columnName"
       FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND data_type = $1
      ORDER BY table_name, column_name`,
    [dataType],
  );
}

function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
