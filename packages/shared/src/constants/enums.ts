// 任務 / 團隊 / 通知等領域枚舉常量。
// SQLite 無原生 ENUM，這些常量同時用於：DB 的 CHECK 約束、Zod 校驗、TS 聯合類型。
// 這裡是所有枚舉值的唯一事實來源（single source of truth）。

export const TASK_PRIORITY = ["low", "medium", "high"] as const;
export const TASK_STATUS = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const TASK_TYPE = ["normal", "recurring", "window", "project"] as const;

export const TEAM_ROLE = ["admin", "member"] as const;

export const HISTORY_ACTION = [
  "created",
  "updated",
  "deleted",
  "status_changed",
  "assigned",
] as const;

export const NOTIFICATION_TYPE = [
  "due_reminder",
  "task_assigned",
  "status_changed",
  "team_invite",
  "task_deleted",
] as const;

export const RECURRENCE_UNIT = ["day", "week", "month", "year"] as const;

export type TaskPriority = (typeof TASK_PRIORITY)[number];
export type TaskStatus = (typeof TASK_STATUS)[number];
export type TaskType = (typeof TASK_TYPE)[number];
export type TeamRole = (typeof TEAM_ROLE)[number];
export type HistoryAction = (typeof HISTORY_ACTION)[number];
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];
export type RecurrenceUnit = (typeof RECURRENCE_UNIT)[number];
