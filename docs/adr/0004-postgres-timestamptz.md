# ADR-0004: PostgreSQL 时间列统一使用 timestamptz

- 状态：已采纳
- 日期：2026-11-06

## 背景

工作台「更新时间」一度显示成未来时间：实际 19:46 的单据显示为次日 03:46，正好快 8 小时。

根因是 PostgreSQL 的 `timestamp`（无时区）与 node-postgres 的组合：

1. `timestamp` 列保存的是**数据库会话时区**的墙上时间，写入和读取都会按数据库的
   `TimeZone` 设置换算。
2. node-postgres 在写入时用 **Node 进程时区**给 `Date` 加偏移，读取时又按 **Node 进程时区**
   把无时区字符串解释成时刻。
3. 生产 API 跑在 `node:20-bookworm` 容器里，未设置 `TZ`，进程时区是 UTC；而数据库会话时区
   通常是 `Asia/Shanghai`。

三者叠加的结果是：写入时上海 19:46 存成 `2026-11-06 19:46:00`，读回时被当成 UTC 的 19:46，
前端再按 `Asia/Shanghai` 渲染，就变成了次日 03:46。数据库里存的不是时刻，而是「谁的墙上时间」
取决于进程和会话的时区配置，任何一处改动都会让历史数据整体漂移。

## 决策

1. **PostgreSQL 的时间列一律使用 `timestamp with time zone`**，由 `DATETIME_COLUMN_TYPE`
   按方言给出（SQLite 仍用 `datetime`，驱动已按 UTC 存字符串）。实体上的 `@CreateDateColumn`
   / `@UpdateDateColumn` / `@Column` 都显式声明该类型，避免 `migration:generate` 把它改回去。
2. **历史数据按数据库会话时区重新解释**：迁移
   `1787500000001-PostgresTimestamptzDateColumns` 用
   `USING 列名 AT TIME ZONE current_setting('TimeZone')` 把 `timestamp` 转成 `timestamptz`。
   该表达式对 `timestamp → timestamptz` 和反向转换都成立，因此 `down()` 复用同一段逻辑。
   迁移遍历 `information_schema` 动态发现列，不需要维护表清单。
3. **日期区间过滤只传 `Date` 实例**，由 `startOfBusinessDate()` / `endOfBusinessDate()`
   按业务时区算出边界，不再拼 `'YYYY-MM-DD 00:00:00'` 字符串去和列比较。
4. **业务日期仍按 `OA_TIME_ZONE`（默认 `Asia/Shanghai`）呈现**：时间列只负责存绝对时刻，
   「哪一天」由前端与后端的业务时区工具统一计算。

## 后果

- 时间显示不再依赖 API 进程时区或数据库 `TimeZone`，容器、PM2、本地开发行为一致。
- 修复上线时不需要手工订正数据：迁移会把历史行落到正确的绝对时刻。
- 新增时间列必须走 `DATETIME_COLUMN_TYPE`；直接用 `@CreateDateColumn()` 默认类型会重新引入
  无时区列，`column-types.spec.ts` 与真实 PostgreSQL 用例 `test/postgres-timestamptz.spec.ts`
  会拦住这类回归。
- 与时间列比较时不能再传裸字符串日期：字符串会被数据库按会话时区解释，等于把老问题换个地方。
