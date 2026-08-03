/** 日期时间列类型按数据库方言解析：PostgreSQL 用 timestamp，SQLite 用 datetime。 */
export const DATETIME_COLUMN_TYPE: 'timestamp' | 'datetime' = /^postgres(ql)?:\/\//.test(
  process.env.OA_DATABASE_URL ?? '',
)
  ? 'timestamp'
  : 'datetime';
