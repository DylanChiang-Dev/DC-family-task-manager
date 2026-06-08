import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import {
  TASK_PRIORITY,
  TASK_STATUS,
  TASK_TYPE,
  TEAM_ROLE,
  HISTORY_ACTION,
  NOTIFICATION_TYPE,
} from "@ftm/shared";
import type { RecurrenceConfig } from "@ftm/shared";

// ── 公共時間戳列 ──
const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

// ── teams ──────────────────────────────
export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    inviteCode: text("invite_code").notNull().unique(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    inviteCodeIdx: index("idx_invite_code").on(t.inviteCode),
  }),
);

// ── users ──────────────────────────────
export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    nickname: text("nickname").notNull(),
    email: text("email"),
    currentTeamId: integer("current_team_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    usernameIdx: index("idx_username").on(t.username),
  }),
);

// ── team_members ───────────────────────
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: [...TEAM_ROLE] }).notNull().default("member"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uniqTeamUser: uniqueIndex("uniq_team_user").on(t.teamId, t.userId),
    teamIdx: index("idx_tm_team").on(t.teamId),
    userIdx: index("idx_tm_user").on(t.userId),
  }),
);

// ── categories ─────────────────────────
export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#3B82F6"),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uniqTeamName: uniqueIndex("uniq_team_category").on(t.teamId, t.name),
    teamIdx: index("idx_cat_team").on(t.teamId),
  }),
);

// ── tasks ──────────────────────────────
export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assigneeId: integer("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    priority: text("priority", { enum: [...TASK_PRIORITY] })
      .notNull()
      .default("medium"),
    status: text("status", { enum: [...TASK_STATUS] })
      .notNull()
      .default("pending"),
    dueDate: text("due_date"),
    taskType: text("task_type", { enum: [...TASK_TYPE] })
      .notNull()
      .default("normal"),
    recurrenceConfig: text("recurrence_config", {
      mode: "json",
    }).$type<RecurrenceConfig>(),
    parentTaskId: integer("parent_task_id"),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    teamStatusIdx: index("idx_team_status").on(t.teamId, t.status),
    assigneeIdx: index("idx_assignee").on(t.assigneeId),
    dueDateIdx: index("idx_due_date").on(t.dueDate),
    taskTypeIdx: index("idx_task_type").on(t.taskType),
    parentIdx: index("idx_parent").on(t.parentTaskId),
  }),
);

// ── task_comments ──────────────────────
export const taskComments = sqliteTable(
  "task_comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    taskIdx: index("idx_comment_task").on(t.taskId),
  }),
);

// ── task_history ───────────────────────
export const taskHistory = sqliteTable(
  "task_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action", { enum: [...HISTORY_ACTION] }).notNull(),
    changes: text("changes", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    taskIdx: index("idx_hist_task").on(t.taskId),
    createdIdx: index("idx_hist_created").on(t.createdAt),
  }),
);

// ── notifications ──────────────────────
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    taskId: integer("task_id").references(() => tasks.id, {
      onDelete: "cascade",
    }),
    type: text("type", { enum: [...NOTIFICATION_TYPE] }).notNull(),
    content: text("content").notNull(),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userUnreadIdx: index("idx_user_unread").on(t.userId, t.isRead),
    createdIdx: index("idx_notif_created").on(t.createdAt),
  }),
);
