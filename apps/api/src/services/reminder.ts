import type { Env } from "../types";
import { createDb } from "../db/client";
import { users, tasks, notifications } from "../db/schema";
import { eq, and, notInArray, isNotNull, lte, gte, lt } from "drizzle-orm";
import { shouldShowRecurringTask } from "@ftm/shared";
import { sendEmail } from "./mail";

/**
 * 每日定時任務：掃描到期任務 + 週期任務，發送提醒通知。
 * 冪等設計：同一任務同一日期不會重複發送通知。
 */
export async function runDueReminders(env: Env): Promise<void> {
  const db = createDb(env.DB);
  const now = new Date();
  const todayStr = toDateStr(now);
  const tomorrowStr = toDateStr(new Date(now.getTime() + 24 * 3600_000));

  console.log(`[reminder] scanning due tasks: ${todayStr} ~ ${tomorrowStr}`);

  // ── 1. 到期提醒（due_date 在窗口內的普通任務） ──
  const dueTasks = await db
    .select({
      id: tasks.id,
      teamId: tasks.teamId,
      title: tasks.title,
      assigneeId: tasks.assigneeId,
      creatorId: tasks.creatorId,
      dueDate: tasks.dueDate,
    })
    .from(tasks)
    .where(
      and(
        notInArray(tasks.status, ["completed", "cancelled"]),
        gte(tasks.dueDate, todayStr),
        lte(tasks.dueDate, tomorrowStr),
      ),
    );

  console.log(`[reminder] found ${dueTasks.length} due tasks`);

  for (const task of dueTasks) {
    const targetUserId = task.assigneeId ?? task.creatorId;
    await remindUser(env, db, targetUserId, task.id, "due_reminder", todayStr, task.title);
  }

  // ── 2. 週期任務提醒 ──
  const recurringTasks = await db
    .select({
      id: tasks.id,
      teamId: tasks.teamId,
      title: tasks.title,
      assigneeId: tasks.assigneeId,
      creatorId: tasks.creatorId,
      recurrenceConfig: tasks.recurrenceConfig,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.taskType, "recurring"),
        isNotNull(tasks.recurrenceConfig),
        notInArray(tasks.status, ["completed", "cancelled"]),
      ),
    );

  console.log(`[reminder] found ${recurringTasks.length} recurring tasks`);

  for (const task of recurringTasks) {
    if (shouldShowRecurringTask(task.recurrenceConfig, todayStr)) {
      const targetUserId = task.assigneeId ?? task.creatorId;
      await remindUser(env, db, targetUserId, task.id, "due_reminder", todayStr, task.title);
    }
  }

  console.log("[reminder] done");
}

/**
 * 向單個用戶發送提醒（帶去重）。
 * 同任務同類型當天只發一次。
 */
async function remindUser(
  env: Env,
  db: ReturnType<typeof createDb>,
  userId: number,
  taskId: number,
  type: "due_reminder",
  todayStr: string,
  taskTitle: string,
): Promise<void> {
  // 去重：查是否有當天同任務同類型的通知
  const todayStart = new Date(todayStr + "T00:00:00.000Z").getTime();

  const existing = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.userId, userId),
      eq(notifications.taskId, taskId),
      eq(notifications.type, type),
      gte(notifications.createdAt, new Date(todayStart)),
    ),
  });

  if (existing) return;

  const content = type === "due_reminder"
    ? `任務「${taskTitle}」即將到期`
    : `任務「${taskTitle}」需要處理`;

  await db.insert(notifications).values({
    userId,
    taskId,
    type,
    content,
  });

  // 若用戶有 email，嘗試發送郵件提醒
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, nickname: true },
  });

  if (user?.email) {
    await sendEmail(env, {
      to: user.email,
      subject: `[家庭任務] ${content}`,
      html: `<p>${user.nickname}，你好：</p><p>${content}。</p><p>請登錄系統查看詳情。</p>`,
    });
  }
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
