import type { Env } from "../types";
import { createDb } from "../db/client";
import { users, tasks, notifications } from "../db/schema";
import { eq, and, or, notInArray, isNotNull, lte, gte, inArray, ne } from "drizzle-orm";
import { formatDateKeyUTC } from "@ftm/shared";
import { sendEmail } from "./mail";

/**
 * 每日定時任務：掃描到期任務 + 週期任務，發送提醒通知。
 * 冪等設計：同一任務同一日期不會重複發送通知。
 */
export async function runDueReminders(env: Env): Promise<void> {
  try {
    const db = createDb(env.DB);
    const now = new Date();
    const todayStr = formatDateKeyUTC(now);

    // L-02: 安全獲取明天日期字串，防止 DST 問題
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = formatDateKeyUTC(tomorrow);

    console.log(`[reminder] scanning due tasks: ${todayStr} ~ ${tomorrowStr}`);

    // ── 1. 到期提醒（due_date 在窗口內） ──
    // 排除週期「模板」本身（recurring 且 parentTaskId 為空），實例正常走到期路徑
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
          eq(tasks.isBacklog, false),
          or(
            // 到期任務（排除週期「模板」本身，實例正常走到期路徑）
            and(
              isNotNull(tasks.dueDate),
              gte(tasks.dueDate, todayStr),
              lte(tasks.dueDate, tomorrowStr),
              or(ne(tasks.taskType, "recurring"), isNotNull(tasks.parentTaskId)),
            ),
            // 時間段任務以 endDate 為截止
            and(
              eq(tasks.taskType, "window"),
              isNotNull(tasks.endDate),
              gte(tasks.endDate, todayStr),
              lte(tasks.endDate, tomorrowStr),
            ),
          ),
        ),
      );

    console.log(`[reminder] found ${dueTasks.length} due tasks`);

    const allTasks = dueTasks;
    if (allTasks.length === 0) {
      console.log("[reminder] no tasks to process, done");
      return;
    }

    // 收集所有唯一的目標用戶 ID
    const targetUserIds = [...new Set(allTasks.map((t) => t.assigneeId ?? t.creatorId))];

    // 批量查詢用戶郵件與暱稱
    const usersList = await db.query.users.findMany({
      where: inArray(users.id, targetUserIds),
      columns: { id: true, email: true, nickname: true },
    });
    const userMap = new Map(usersList.map((u) => [u.id, u]));

    // 批量查詢當天已有的提醒通知（用作去重）
    const todayStart = new Date(todayStr + "T00:00:00.000Z");
    const existingNotifications = await db.query.notifications.findMany({
      where: and(
        eq(notifications.type, "due_reminder"),
        inArray(notifications.userId, targetUserIds),
        gte(notifications.createdAt, todayStart),
      ),
      columns: { userId: true, taskId: true },
    });
    const existingSet = new Set(
      existingNotifications.map((n) => `${n.userId}:${n.taskId}`)
    );

    // 按用戶分組需要處理的提醒任務
    const userReminders = new Map<number, typeof allTasks>();
    for (const task of allTasks) {
      const targetUserId = task.assigneeId ?? task.creatorId;
      // 去重：如果當天已經為該用戶對該任務發送過 due_reminder，則跳過
      if (existingSet.has(`${targetUserId}:${task.id}`)) {
        continue;
      }
      if (!userReminders.has(targetUserId)) {
        userReminders.set(targetUserId, []);
      }
      userReminders.get(targetUserId)!.push(task);
    }

    // 準備批量寫入通知的資料與並行發送的郵件
    const notificationsToInsert: (typeof notifications.$inferInsert)[] = [];
    const emailsToSend: { to: string; subject: string; html: string }[] = [];

    for (const [userId, taskList] of userReminders.entries()) {
      const user = userMap.get(userId);
      if (!user) continue;

      // 為每個任務生成通知記錄
      for (const task of taskList) {
        notificationsToInsert.push({
          userId,
          taskId: task.id,
          type: "due_reminder",
          content: `任務「${task.title}」需要處理（即將到期或週期提醒）`,
        });
      }

      // M-03: 合併郵件提醒，防止 email spam
      if (user.email) {
        const subject = `[家庭任務] 您有 ${taskList.length} 個任務即將到期/需要處理`;
        const taskListHtml = taskList
          .map((t) => `<li><strong>${t.title}</strong></li>`)
          .join("");
        const html = `
          <p>${user.nickname}，您好：</p>
          <p>系統提醒您，您有以下任務即將到期或需要處理：</p>
          <ul>${taskListHtml}</ul>
          <p>請登入系統查看詳情與進行更新。</p>
        `;
        emailsToSend.push({ to: user.email, subject, html });
      }
    }

    // 批量寫入通知到資料庫
    if (notificationsToInsert.length > 0) {
      console.log(`[reminder] inserting ${notificationsToInsert.length} notifications...`);
      await db.insert(notifications).values(notificationsToInsert);
    }

    // 並行發送合併後的提醒郵件 (具有單獨 error isolation)
    if (emailsToSend.length > 0) {
      console.log(`[reminder] sending ${emailsToSend.length} consolidated emails...`);
      await Promise.all(
        emailsToSend.map(async (email) => {
          try {
            await sendEmail(env, email);
          } catch (err) {
            console.error(`[reminder] failed to send email to ${email.to}:`, err);
          }
        })
      );
    }

    console.log("[reminder] done");
  } catch (err) {
    console.error("[reminder] runDueReminders execution error:", err);
  }
}
