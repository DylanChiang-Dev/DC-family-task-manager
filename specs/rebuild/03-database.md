# 03 · D1 数据库设计

> 上一篇：[02 Monorepo](./02-monorepo.md) ｜ 下一篇：[04 API 设计](./04-api.md)

## 1. 总览

- 引擎：**Cloudflare D1**（基于 SQLite）。
- ORM：**Drizzle**（`drizzle-orm/d1` + `drizzle-kit` 生成迁移）。
- 表数量：8 张，沿用老系统领域模型，但按 SQLite 最佳实践重写。
- 数据隔离：所有业务表带 `team_id`，查询一律按当前团队过滤（多团队数据隔离）。

## 2. MySQL → SQLite 关键差异处理

| MySQL 用法 | SQLite / D1 做法 | 说明 |
|-----------|-----------------|------|
| `INT UNSIGNED AUTO_INCREMENT` | `integer primary key autoincrement` | SQLite 无 UNSIGNED；主键自增用 INTEGER |
| `ENUM('a','b')` | `text` + `CHECK(col IN (...))` + TS 联合类型 | SQLite 无 ENUM；枚举值在 shared/constants 定义，DB 加 CHECK 约束 |
| `JSON` 类型 | `text`（存 JSON 字符串）+ Drizzle `{ mode: 'json' }` | D1 无原生 JSON 类型；Drizzle 可自动序列化/反序列化 |
| `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `integer`（Unix 毫秒）默认 `unixepoch()`，或 text ISO | 推荐存**整数毫秒**，Drizzle `timestamp_ms` 模式，前端 `new Date(ms)` 直接用 |
| `ON UPDATE CURRENT_TIMESTAMP` | 由应用层在 update 时写 `updatedAt` | SQLite 无该语法，统一在 service/Drizzle 层处理 |
| `BOOLEAN` | `integer`（0/1）+ Drizzle `{ mode: 'boolean' }` | |
| `VARCHAR(n)` | `text`（SQLite 不强制长度），长度校验交给 Zod | DB 不限长，业务长度在 Zod 校验 |
| 外键 `ON DELETE CASCADE` | 同语法，但 **D1 需开启** `PRAGMA foreign_keys=ON` | Drizzle migration 中声明 references + onDelete |

> ⚠️ **时间统一用 Unix 毫秒整数**（`createdAt`、`updatedAt`、`dueDate` 等）。好处：排序快、跨时区无歧义、前端 `new Date(ms)` 即用。`due_date` 老系统是 DATE（仅日期），新系统也用毫秒整数存当日 0 点（或单独存 `YYYY-MM-DD` text，见下方决策）。

## 3. 枚举常量（定义在 packages/shared/constants）

```ts
// packages/shared/src/constants/enums.ts
export const TASK_PRIORITY = ['low', 'medium', 'high'] as const;
export const TASK_STATUS   = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export const TASK_TYPE     = ['normal', 'recurring', 'repeatable'] as const;
export const TEAM_ROLE     = ['admin', 'member'] as const;
export const HISTORY_ACTION = ['created', 'updated', 'deleted', 'status_changed', 'assigned'] as const;
export const NOTIFICATION_TYPE = ['due_reminder', 'task_assigned', 'status_changed', 'team_invite', 'task_deleted'] as const;
export const RECURRENCE_FREQ = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export type TaskPriority = (typeof TASK_PRIORITY)[number];
export type TaskStatus   = (typeof TASK_STATUS)[number];
// ...其余同理
```

> 新增了 `task_deleted` 通知类型（老系统有 sendTaskDeleted 但未在枚举里）。

## 4. 实体关系图（ER）

```
teams ──1:N── team_members ──N:1── users
  │                                   │
  │ 1:N                               │ creator / assignee
  ▼                                   ▼
tasks ───────────────────────────────┘
  │  ├─ N:1 categories (可空)
  │  ├─ self-ref parent_task_id (repeatable)
  │  ├─ 1:N task_comments
  │  └─ 1:N task_history
  │
users ──1:N── notifications ──N:1(可空)── tasks
```

## 5. Drizzle Schema 设计（apps/api/src/db/schema.ts）

> 以下为设计意图示意，字段名用 camelCase（TS 侧），DB 列名用 snake_case。

```ts
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import {
  TASK_PRIORITY, TASK_STATUS, TASK_TYPE, TEAM_ROLE,
  HISTORY_ACTION, NOTIFICATION_TYPE,
} from '@ftm/shared';

// 公共时间戳列
const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
};

// ── teams ──────────────────────────────
export const teams = sqliteTable('teams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdBy: integer('created_by').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...timestamps,
}, (t) => ({
  inviteCodeIdx: index('idx_invite_code').on(t.inviteCode),
}));

// ── users ──────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),     // 见 05：算法可能改 scrypt
  nickname: text('nickname').notNull(),
  email: text('email'),                              // 新增：用于邮件通知（可空）
  currentTeamId: integer('current_team_id'),         // 软引用，避免循环外键
  ...timestamps,
}, (t) => ({
  usernameIdx: index('idx_username').on(t.username),
}));

// ── team_members ───────────────────────
export const teamMembers = sqliteTable('team_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: TEAM_ROLE }).notNull().default('member'),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  uniqTeamUser: unique('uniq_team_user').on(t.teamId, t.userId),
  teamIdx: index('idx_tm_team').on(t.teamId),
  userIdx: index('idx_tm_user').on(t.userId),
}));

// ── categories ─────────────────────────
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3B82F6'),   // HEX，Zod 校验格式
  creatorId: integer('creator_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  uniqTeamName: unique('uniq_team_category').on(t.teamId, t.name),
  teamIdx: index('idx_cat_team').on(t.teamId),
}));

// ── tasks ──────────────────────────────
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  creatorId: integer('creator_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  assigneeId: integer('assignee_id')
    .references(() => users.id, { onDelete: 'set null' }),
  categoryId: integer('category_id')
    .references(() => categories.id, { onDelete: 'set null' }),
  priority: text('priority', { enum: TASK_PRIORITY }).notNull().default('medium'),
  status: text('status', { enum: TASK_STATUS }).notNull().default('pending'),
  dueDate: text('due_date'),                            // 'YYYY-MM-DD'，仅日期，见决策
  taskType: text('task_type', { enum: TASK_TYPE }).notNull().default('normal'),
  recurrenceConfig: text('recurrence_config', { mode: 'json' })
    .$type<RecurrenceConfig>(),                         // 类型见下
  parentTaskId: integer('parent_task_id'),              // self-ref，应用层维护
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  ...timestamps,
}, (t) => ({
  teamStatusIdx: index('idx_team_status').on(t.teamId, t.status),
  assigneeIdx: index('idx_assignee').on(t.assigneeId),
  dueDateIdx: index('idx_due_date').on(t.dueDate),
  taskTypeIdx: index('idx_task_type').on(t.taskType),
  parentIdx: index('idx_parent').on(t.parentTaskId),
}));

// ── task_comments ──────────────────────
export const taskComments = sqliteTable('task_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id').notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  taskId: integer('task_id').notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  taskIdx: index('idx_comment_task').on(t.taskId),
}));

// ── task_history ───────────────────────
export const taskHistory = sqliteTable('task_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action', { enum: HISTORY_ACTION }).notNull(),
  changes: text('changes', { mode: 'json' }).$type<HistoryChanges>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  taskIdx: index('idx_hist_task').on(t.taskId),
  createdIdx: index('idx_hist_created').on(t.createdAt),
}));

// ── notifications ──────────────────────
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdBy: integer('created_by')
    .references(() => users.id, { onDelete: 'set null' }),  // 触发者
  taskId: integer('task_id')
    .references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type', { enum: NOTIFICATION_TYPE }).notNull(),
  content: text('content').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => ({
  userUnreadIdx: index('idx_user_unread').on(t.userId, t.isRead),
  createdIdx: index('idx_notif_created').on(t.createdAt),
}));
```

## 6. recurrence_config 类型（沿用老系统结构）

```ts
// packages/shared/src/schemas/recurrence.ts
type RecurrenceConfig =
  | { frequency: 'daily' }
  | { frequency: 'weekly'; days: number[] }    // 0-6, Sun=0
  | { frequency: 'monthly'; dates: number[] }  // 1-31
  | { frequency: 'yearly'; month: number; date: number }; // month 1-12
```

用 Zod discriminated union 校验（见 04/08）。老系统的前端虚拟实例生成逻辑（`shouldShowRecurringTask`）保留到前端，规则不变。

## 7. 索引策略

- **最重要的复合索引**：`tasks(team_id, status)` —— 列表查询永远先按团队再按状态过滤。
- `tasks(assignee_id)`、`tasks(due_date)`、`tasks(task_type)`：分别服务"我的任务""到期扫描（Cron）""周期任务筛选"。
- `notifications(user_id, is_read)`：未读通知红点查询。
- `team_members(team_id)` / `(user_id)`：成员列表与"我的团队"。
- 唯一约束：`teams.invite_code`、`users.username`、`team_members(team_id,user_id)`、`categories(team_id,name)`。

## 8. 几处相对老系统的有意改动

| 改动 | 原因 |
|------|------|
| `users.password` → `password_hash`，新增 `users.email` | 命名更清晰；email 用于可选邮件通知 |
| `notifications` 新增 `created_by` 列并入枚举 `task_deleted` | 对齐 NotificationService 实际行为（老 schema 漏了） |
| 时间戳统一为 Unix 毫秒整数 | SQLite 友好、跨时区无歧义 |
| `current_team_id` 不设外键 | 避免 users↔teams 循环外键，改由应用层保证一致性 |
| 枚举改 text + CHECK + TS 联合 | SQLite 无 ENUM |

## 9. 迁移工作流（drizzle-kit）

```
1. 改 schema.ts
2. pnpm --filter api db:generate   → 生成 SQL 到 db/migrations/
3. 本地：wrangler d1 migrations apply ftm --local
4. 线上：wrangler d1 migrations apply ftm --remote
```

- 迁移文件纳入 git，作为 schema 演进的事实来源。
- 种子数据（如默认 admin、demo 任务）单独放 `db/seed.ts`，仅开发用。

## 10. 决策标记

- ✅ 8 张表结构、枚举改 text+CHECK、时间用毫秒整数。
- ⚠️ `due_date` 用 `'YYYY-MM-DD'` text 还是毫秒整数：**建议用 text 'YYYY-MM-DD'**，因为它是"日期"而非"时刻"，避免时区把日期挪到前后一天。本文档按 text 设计。
- ❓ `task_comments` 老系统前端未充分使用，是否保留：**保留**，结构成本低、未来有用。
