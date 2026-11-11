/**
 * 日期时间列类型按数据库方言解析。
 *
 * PostgreSQL 必须使用带时区的时间列（`timestamp with time zone` / `timestamptz`）：
 * 无时区的 `timestamp` 保存的是**数据库会话时区**的墙上时间，而 node-postgres 在写入和读取时
 * 都按 **Node 进程时区**换算。部署容器（node:20-bookworm）默认是 UTC、数据库会话常为
 * Asia/Shanghai，两者不一致时所有时间读回都快 8 小时，列表“更新时间”直接显示成未来时间。
 *
 * SQLite 的 `datetime` 由驱动统一按 UTC 存字符串，读取时再补 Z，不存在该问题。
 * 文案使用 `timestamp with time zone` 而非常量 `timestamptz`，原因是 TypeORM 的
 * `@Column(type, options)` 重载只接受同一族类型，两者混用会丢失类型推导。
 */
const usesPostgres = /^postgres(ql)?:\/\//.test(process.env.OA_DATABASE_URL ?? '');

export const DATETIME_COLUMN_TYPE: 'timestamp with time zone' | 'datetime' = usesPostgres
  ? 'timestamp with time zone'
  : 'datetime';
