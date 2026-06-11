import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createTaskSchema, updateTaskSchema, createCommentSchema } from "@ftm/shared";
import type { TaskResponse, TaskStatus } from "@ftm/shared";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { users, tasks, taskComments, taskHistory, notifications, categories, teamMembers } from "../db/schema";
import { eq, and, or, inArray, desc, ne, gte, lte, isNotNull, type SQL } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { teamMiddleware } from "../middleware/team";
import { fail, ok } from "../lib/response";
import { zodErrorHook } from "../lib/zod-hook";
import { generateInstancesForTemplate, pruneFutureInstances, todayISO } from "../services/recurrence";

export const taskRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

taskRoutes.use("*", authMiddleware, teamMiddleware);

// ── Helpers ──

/** Batch-load users by IDs, return a map of id -> { username, nickname } */
async function loadUserMap(db: ReturnType<typeof createDb>, ids: number[]) {
  const unique = [...new Set(ids.filter((id) => id != null))];
  if (unique.length === 0) return new Map<number, { username: string; nickname: string }>();
  const rows = await db
    .select({ id: users.id, username: users.username, nickname: users.nickname })
    .from(users)
    .where(inArray(users.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Batch-load categories by IDs */
async function loadCategoryMap(db: ReturnType<typeof createDb>, ids: number[]) {
  const unique = [...new Set(ids.filter((id) => id != null))];
  if (unique.length === 0) return new Map<number, { name: string; color: string }>();
  const rows = await db
    .select({ id: categories.id, name: categories.name, color: categories.color })
    .from(categories)
    .where(inArray(categories.id, unique));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Shape a raw task row into a TaskResponse */
function shapeTask(
  t: typeof tasks.$inferSelect,
  userMap: Map<number, { username: string; nickname: string }>,
  catMap: Map<number, { name: string; color: string }>,
  statsMap?: Map<number, { total: number; completed: number; progress: number }>,
): TaskResponse {
  const creator = userMap.get(t.creatorId);
  const assignee = t.assigneeId ? userMap.get(t.assigneeId) : undefined;
  const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
  return {
    id: t.id,
    teamId: t.teamId,
    title: t.title,
    description: t.description,
    creatorId: t.creatorId,
    creatorNickname: creator?.nickname ?? "",
    assigneeId: t.assigneeId,
    assigneeNickname: assignee?.nickname ?? null,
    categoryId: t.categoryId,
    categoryName: cat?.name ?? null,
    categoryColor: cat?.color ?? null,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    taskType: t.taskType,
    recurrenceConfig: t.recurrenceConfig,
    parentTaskId: t.parentTaskId,
    projectId: t.projectId,
    projectStats:
      t.taskType === "project" && statsMap
        ? statsMap.get(t.id) ?? { total: 0, completed: 0, progress: 0 }
        : null,
    startDate: t.startDate,
    endDate: t.endDate,
    progress: t.progress,
    isBacklog: t.isBacklog,
    // L-03: completedAt 在 timestamp_ms mode 下一定是 Date | null，不需雙層可選鏈
    completedAt: t.completedAt ? t.completedAt.getTime() : null,
    createdAt: t.createdAt.getTime(),
    updatedAt: t.updatedAt.getTime(),
  };
}

// M-05: 驗證 assigneeId 是否為團隊成員
async function validateAssignee(db: ReturnType<typeof createDb>, teamId: number, assigneeId: number): Promise<boolean> {
  const member = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, assigneeId)),
    columns: { id: true },
  });
  return !!member;
}

// M-06: 驗證 categoryId 是否屬於當前團隊
async function validateCategory(db: ReturnType<typeof createDb>, teamId: number, categoryId: number): Promise<boolean> {
  const cat = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.teamId, teamId)),
    columns: { id: true },
  });
  return !!cat;
}

// 驗證 projectId 是否指向同團隊的 project 類型任務
async function validateProject(db: ReturnType<typeof createDb>, teamId: number, projectId: number): Promise<boolean> {
  const p = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, projectId), eq(tasks.teamId, teamId), eq(tasks.taskType, "project")),
    columns: { id: true },
  });
  return !!p;
}

// ── GET /tasks ──
// 可選查詢參數（均不帶時行為與舊版一致）：
// - status: 任務狀態
// - from/to (YYYY-MM-DD): 日期重疊過濾——dueDate 落在 [from, to]，或 window 的
//   [startDate, endDate] 與 [from, to] 重疊；無任何日期的任務（含 backlog、週期模板）會被排除
// - limit (1-500) / offset (≥0): 分頁；offset 必須搭配 limit
const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

taskRoutes.get("/", async (c) => {
  const teamId = c.get("teamId")!;
  const db = createDb(c.env.DB);
  const statusParam = c.req.query("status");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");

  const validStatuses: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];
  const status = validStatuses.includes(statusParam as TaskStatus) ? (statusParam as TaskStatus) : null;

  if ((from && !DATE_PARAM_RE.test(from)) || (to && !DATE_PARAM_RE.test(to))) {
    return c.json(fail("VALIDATION_ERROR", "from/to 必須為 YYYY-MM-DD 格式"), 400);
  }
  let limit: number | null = null;
  if (limitParam !== undefined) {
    limit = Number(limitParam);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      return c.json(fail("VALIDATION_ERROR", "limit 必須為 1-500 的整數"), 400);
    }
  }
  let offset: number | null = null;
  if (offsetParam !== undefined) {
    offset = Number(offsetParam);
    if (!Number.isInteger(offset) || offset < 0) {
      return c.json(fail("VALIDATION_ERROR", "offset 必須為不小於 0 的整數"), 400);
    }
    if (limit === null) {
      return c.json(fail("VALIDATION_ERROR", "offset 必須搭配 limit 使用"), 400);
    }
  }

  const conds: SQL[] = [eq(tasks.teamId, teamId)];
  if (status) conds.push(eq(tasks.status, status));
  if (from || to) {
    const dueConds: SQL[] = [isNotNull(tasks.dueDate)];
    if (from) dueConds.push(gte(tasks.dueDate, from));
    if (to) dueConds.push(lte(tasks.dueDate, to));
    const windowConds: SQL[] = [isNotNull(tasks.startDate), isNotNull(tasks.endDate)];
    if (to) windowConds.push(lte(tasks.startDate, to));
    if (from) windowConds.push(gte(tasks.endDate, from));
    conds.push(or(and(...dueConds)!, and(...windowConds)!)!);
  }

  let query = db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(desc(tasks.createdAt))
    .$dynamic();
  if (limit !== null) query = query.limit(limit);
  if (offset !== null) query = query.offset(offset);
  const rows = await query;

  const userIds = rows.flatMap((t) => [t.creatorId, t.assigneeId].filter(Boolean) as number[]);
  const catIds = rows.map((t) => t.categoryId).filter(Boolean) as number[];
  const userMap = await loadUserMap(db, userIds);
  const catMap = await loadCategoryMap(db, catIds);

  return c.json(ok(rows.map((t) => shapeTask(t, userMap, catMap))));
});

// ── GET /tasks/:id ──
taskRoutes.get("/:id", async (c) => {
  const teamId = c.get("teamId")!;
  const taskId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(taskId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的任務 ID"), 400);
  }

  const t = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)),
  });
  if (!t) {
    return c.json(fail("NOT_FOUND", "任務不存在"), 404);
  }

  const userIds = [t.creatorId, t.assigneeId].filter(Boolean) as number[];
  const catIds = [t.categoryId].filter(Boolean) as number[];
  const userMap = await loadUserMap(db, userIds);
  const catMap = await loadCategoryMap(db, catIds);

  return c.json(ok(shapeTask(t, userMap, catMap)));
});

// ── POST /tasks ──
taskRoutes.post("/", zValidator("json", createTaskSchema, zodErrorHook), async (c) => {
  const teamId = c.get("teamId")!;
  const userId = c.get("userId")!;
  const body = c.req.valid("json");
  const db = createDb(c.env.DB);

  // M-05: 驗證 assigneeId 是否為團隊成員
  if (body.assigneeId) {
    const isValid = await validateAssignee(db, teamId, body.assigneeId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "指派對象不是團隊成員"), 400);
    }
  }

  // M-06: 驗證 categoryId 是否屬於當前團隊
  if (body.categoryId) {
    const isValid = await validateCategory(db, teamId, body.categoryId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "分類不屬於當前團隊"), 400);
    }
  }

  if (body.projectId) {
    const isValid = await validateProject(db, teamId, body.projectId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "所屬項目不存在或不是項目類型"), 400);
    }
  }

  const [task] = await db
    .insert(tasks)
    .values({
      teamId,
      title: body.title,
      description: body.description ?? null,
      creatorId: userId,
      assigneeId: body.assigneeId ?? null,
      categoryId: body.categoryId ?? null,
      priority: body.priority,
      status: body.status,
      dueDate: body.dueDate ?? null,
      taskType: body.taskType,
      recurrenceConfig: body.recurrenceConfig ?? null,
      parentTaskId: body.parentTaskId ?? null,
      projectId: body.projectId ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      progress: body.progress ?? 0,
      isBacklog: body.isBacklog ?? false,
    })
    .returning();

  if (!task) {
    return c.json(fail("INTERNAL", "創建任務失敗"), 500);
  }

  await db.insert(taskHistory).values({
    taskId: task.id,
    userId,
    action: "created",
    changes: { title: body.title, status: body.status },
  });

  // 建立週期模板時即時產生實例（補齊 3 年窗 + 保底），不必等 cron
  if (task.taskType === "recurring" && task.parentTaskId == null && task.recurrenceConfig) {
    await generateInstancesForTemplate(db, task, new Date());
  }

  if (body.assigneeId && body.assigneeId !== userId) {
    await db.insert(notifications).values({
      userId: body.assigneeId,
      createdBy: userId,
      taskId: task.id,
      type: "task_assigned",
      content: `你被指派了任務：${body.title}`,
    });
  }

  const userMap = await loadUserMap(db, [userId, body.assigneeId].filter(Boolean) as number[]);
  const catMap = await loadCategoryMap(db, [body.categoryId].filter(Boolean) as number[]);

  return c.json(ok(shapeTask(task, userMap, catMap)), 201);
});

// ── PATCH /tasks/:id ──
taskRoutes.patch("/:id", zValidator("json", updateTaskSchema, zodErrorHook), async (c) => {
  const teamId = c.get("teamId")!;
  const userId = c.get("userId")!;
  const taskId = Number(c.req.param("id"));
  const body = c.req.valid("json");
  const db = createDb(c.env.DB);

  if (Number.isNaN(taskId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的任務 ID"), 400);
  }

  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)),
  });
  if (!existing) {
    return c.json(fail("NOT_FOUND", "任務不存在"), 404);
  }

  // M-05: 驗證 assigneeId
  if (body.assigneeId !== undefined && body.assigneeId !== null && body.assigneeId !== existing.assigneeId) {
    const isValid = await validateAssignee(db, teamId, body.assigneeId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "指派對象不是團隊成員"), 400);
    }
  }

  // M-06: 驗證 categoryId
  if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== existing.categoryId) {
    const isValid = await validateCategory(db, teamId, body.categoryId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "分類不屬於當前團隊"), 400);
    }
  }

  // 驗證週期任務配置一致性
  const finalTaskType = body.taskType ?? existing.taskType;
  let finalRecurrenceConfig = body.recurrenceConfig !== undefined ? body.recurrenceConfig : existing.recurrenceConfig;

  // 如果任務類型變更為非週期任務，且未明確傳入 recurrenceConfig，則自動將其清空
  if (body.taskType !== undefined && body.taskType !== "recurring" && body.recurrenceConfig === undefined) {
    finalRecurrenceConfig = null;
  }

  // 實例（parentTaskId 非空）的 recurrenceConfig 恆為 null，配置要求只針對模板
  const isExistingInstance = existing.parentTaskId != null;
  if (isExistingInstance && body.recurrenceConfig) {
    return c.json(fail("VALIDATION_ERROR", "週期實例不可設定週期配置，請編輯系列模板"), 400);
  }
  if (finalTaskType === "recurring" && !isExistingInstance && !finalRecurrenceConfig) {
    return c.json(fail("VALIDATION_ERROR", "週期任務必須提供週期配置 (recurrenceConfig)"), 400);
  }
  if (finalTaskType !== "recurring" && finalRecurrenceConfig) {
    return c.json(fail("VALIDATION_ERROR", "只有週期任務才能設置週期配置"), 400);
  }

  // 項目類型約束：不可嵌套、不可成為子任務；有成員任務時不可改類型
  if (finalTaskType === "project") {
    const finalProjectId = body.projectId !== undefined ? body.projectId : existing.projectId;
    if (finalProjectId != null) {
      return c.json(fail("VALIDATION_ERROR", "項目不可掛在其他項目下"), 400);
    }
    const finalParentId = body.parentTaskId !== undefined ? body.parentTaskId : existing.parentTaskId;
    if (finalParentId != null) {
      return c.json(fail("VALIDATION_ERROR", "項目不能成為其他任務的子任務"), 400);
    }
  }
  if (existing.taskType === "project" && finalTaskType !== "project") {
    const child = await db.query.tasks.findFirst({
      where: and(eq(tasks.projectId, taskId), eq(tasks.teamId, teamId)),
      columns: { id: true },
    });
    if (child) {
      return c.json(fail("VALIDATION_ERROR", "項目下還有任務，請先移除任務歸屬再變更類型"), 400);
    }
  }
  if (body.projectId != null && body.projectId !== existing.projectId) {
    if (body.projectId === taskId) {
      return c.json(fail("VALIDATION_ERROR", "任務不能歸屬自己"), 400);
    }
    const isValid = await validateProject(db, teamId, body.projectId);
    if (!isValid) {
      return c.json(fail("VALIDATION_ERROR", "所屬項目不存在或不是項目類型"), 400);
    }
  }

  // schema 在 update 未帶 taskType 時不檢查 progress，這裡按最終類型兜底
  if (body.progress != null && body.progress !== 0 && finalTaskType !== "window") {
    return c.json(fail("VALIDATION_ERROR", "只有時間段任務可設定進度"), 400);
  }

  // L-04: 使用 Partial 類型代替 Record<string, unknown> 增強類型安全
  const updateData: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
  const changes: Record<string, unknown> = {};

  if (body.title !== undefined && body.title !== existing.title) {
    updateData.title = body.title;
    changes.title = body.title;
  }
  if (body.description !== undefined) {
    updateData.description = body.description;
    changes.description = body.description;
  }
  if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
    updateData.assigneeId = body.assigneeId;
    changes.assigneeId = body.assigneeId;
  }
  if (body.categoryId !== undefined && body.categoryId !== existing.categoryId) {
    updateData.categoryId = body.categoryId;
    changes.categoryId = body.categoryId;
  }
  if (body.priority !== undefined && body.priority !== existing.priority) {
    updateData.priority = body.priority;
    changes.priority = body.priority;
  }
  if (body.status !== undefined && body.status !== existing.status) {
    updateData.status = body.status;
    changes.status = body.status;
    if (body.status === "completed") {
      updateData.completedAt = new Date();
      changes.completedAt = Date.now();
    } else if (existing.status === "completed") {
      // M-07: 從 completed 改為其他狀態時，清除 completedAt
      updateData.completedAt = null;
      changes.completedAt = null;
    }
  }
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate;
    changes.dueDate = body.dueDate;
  }
  if (body.taskType !== undefined && body.taskType !== existing.taskType) {
    updateData.taskType = body.taskType;
    changes.taskType = body.taskType;
    if (body.taskType !== "recurring" && body.recurrenceConfig === undefined && existing.recurrenceConfig !== null) {
      updateData.recurrenceConfig = null;
      changes.recurrenceConfig = null;
    }
  }
  if (body.recurrenceConfig !== undefined) {
    updateData.recurrenceConfig = body.recurrenceConfig;
    changes.recurrenceConfig = body.recurrenceConfig;
  }
  if (body.parentTaskId !== undefined && body.parentTaskId !== existing.parentTaskId) {
    updateData.parentTaskId = body.parentTaskId;
    changes.parentTaskId = body.parentTaskId;
  }
  if (body.projectId !== undefined && body.projectId !== existing.projectId) {
    updateData.projectId = body.projectId;
    changes.projectId = body.projectId;
  }
  if (body.startDate !== undefined && body.startDate !== existing.startDate) {
    updateData.startDate = body.startDate;
    changes.startDate = body.startDate;
  }
  if (body.endDate !== undefined && body.endDate !== existing.endDate) {
    updateData.endDate = body.endDate;
    changes.endDate = body.endDate;
  }
  if (body.progress !== undefined && body.progress !== existing.progress) {
    updateData.progress = body.progress;
    changes.progress = body.progress;
    // 進度拉到 100 視為完成
    if (body.progress >= 100 && existing.status !== "completed") {
      updateData.status = "completed";
      changes.status = "completed";
      updateData.completedAt = new Date();
      changes.completedAt = Date.now();
    }
  }
  if (body.isBacklog !== undefined && body.isBacklog !== existing.isBacklog) {
    updateData.isBacklog = body.isBacklog;
    changes.isBacklog = body.isBacklog;
  }
  // 標記完成的 window 任務，進度補滿 100
  if (
    body.status === "completed" &&
    (body.taskType ?? existing.taskType) === "window" &&
    body.progress === undefined
  ) {
    updateData.progress = 100;
    changes.progress = 100;
  }

  if (Object.keys(changes).length === 0) {
    const userMap = await loadUserMap(db, [existing.creatorId, existing.assigneeId].filter(Boolean) as number[]);
    const catMap = await loadCategoryMap(db, [existing.categoryId].filter(Boolean) as number[]);
    return c.json(ok(shapeTask(existing, userMap, catMap)));
  }

  const [updated] = await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)))
    .returning();

  if (!updated) {
    return c.json(fail("INTERNAL", "更新任務失敗"), 500);
  }

  // 系列模板被編輯：排程變更 → 重生未來實例；內容變更 → 直接傳播到未來未完成實例
  const isTemplate = updated.taskType === "recurring" && updated.parentTaskId == null;
  if (isTemplate && updated.recurrenceConfig) {
    const now = new Date();
    const scheduleChanged = changes.recurrenceConfig !== undefined || changes.taskType !== undefined;
    if (scheduleChanged) {
      // 保留已完成與已開工的實例，只重排 pending
      await pruneFutureInstances(db, updated.id, now, { keepInProgress: true });
      await generateInstancesForTemplate(db, updated, now);
    } else {
      const propagated: Partial<typeof tasks.$inferInsert> = {};
      if (changes.title !== undefined) propagated.title = updated.title;
      if (changes.description !== undefined) propagated.description = updated.description;
      if (changes.assigneeId !== undefined) propagated.assigneeId = updated.assigneeId;
      if (changes.categoryId !== undefined) propagated.categoryId = updated.categoryId;
      if (changes.priority !== undefined) propagated.priority = updated.priority;
      if (Object.keys(propagated).length > 0) {
        await db
          .update(tasks)
          .set({ ...propagated, updatedAt: now })
          .where(
            and(
              eq(tasks.parentTaskId, updated.id),
              ne(tasks.status, "completed"),
              gte(tasks.dueDate, todayISO(now)),
            ),
          );
      }
    }
  }

  // M-04: 記錄主要 action，但 changes 物件已包含所有變更欄位
  const action =
    changes.status ? "status_changed" :
    changes.assigneeId ? "assigned" : "updated";
  await db.insert(taskHistory).values({
    taskId,
    userId,
    action,
    changes,
  });

  if (changes.assigneeId && body.assigneeId && body.assigneeId !== userId) {
    await db.insert(notifications).values({
      userId: body.assigneeId,
      createdBy: userId,
      taskId,
      type: "task_assigned",
      content: `你被指派了任務：${body.title ?? existing.title}`,
    });
  }

  if (changes.status) {
    const notifyTargets = [existing.creatorId];
    if (existing.assigneeId && existing.assigneeId !== existing.creatorId) {
      notifyTargets.push(existing.assigneeId);
    }
    for (const targetId of [...new Set(notifyTargets)]) {
      if (targetId !== userId) {
        await db.insert(notifications).values({
          userId: targetId,
          createdBy: userId,
          taskId,
          type: "status_changed",
          content: `任務「${body.title ?? existing.title}」狀態已變更為 ${body.status}`,
        });
      }
    }
  }

  const userIds = [updated.creatorId, updated.assigneeId].filter(Boolean) as number[];
  const catIds = [updated.categoryId].filter(Boolean) as number[];
  const userMap = await loadUserMap(db, userIds);
  const catMap = await loadCategoryMap(db, catIds);

  return c.json(ok(shapeTask(updated, userMap, catMap)));
});

// ── DELETE /tasks/:id ──
// L-09: 限制只有 creator 或 admin 才能刪除
taskRoutes.delete("/:id", async (c) => {
  const teamId = c.get("teamId")!;
  const userId = c.get("userId")!;
  const memberRole = c.get("memberRole");
  const taskId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(taskId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的任務 ID"), 400);
  }

  const existing = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)),
  });
  if (!existing) {
    return c.json(fail("NOT_FOUND", "任務不存在"), 404);
  }

  // L-09: 只有創建者或 admin 才能刪除任務
  if (existing.creatorId !== userId && memberRole !== "admin") {
    return c.json(fail("FORBIDDEN", "只有任務創建者或管理員才能刪除"), 403);
  }

  // S-03: taskHistory 和 notifications 的 taskId 已改為 SET NULL，
  // 刪除 task 後相關記錄會保留（taskId 變為 null）
  await db.insert(taskHistory).values({
    taskId,
    userId,
    action: "deleted",
    changes: { title: existing.title },
  });

  const notifyTargets = [existing.creatorId];
  if (existing.assigneeId && existing.assigneeId !== existing.creatorId) {
    notifyTargets.push(existing.assigneeId);
  }
  for (const targetId of [...new Set(notifyTargets)]) {
    if (targetId !== userId) {
      await db.insert(notifications).values({
        userId: targetId,
        createdBy: userId,
        taskId,
        type: "task_deleted",
        content: `任務「${existing.title}」已被刪除`,
      });
    }
  }

  // 若刪的是系列模板：先刪未來未完成實例，保留已完成歷史
  if (existing.taskType === "recurring" && existing.parentTaskId == null) {
    await pruneFutureInstances(db, taskId, new Date());
  }

  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)));

  return c.json(ok({ message: "任務已刪除" }));
});

// ── GET /tasks/:id/history ──
taskRoutes.get("/:id/history", async (c) => {
  const teamId = c.get("teamId")!;
  const taskId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(taskId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的任務 ID"), 400);
  }

  const t = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)),
    columns: { id: true },
  });
  if (!t) {
    return c.json(fail("NOT_FOUND", "任務不存在"), 404);
  }

  const rows = await db
    .select()
    .from(taskHistory)
    .where(eq(taskHistory.taskId, taskId))
    .orderBy(desc(taskHistory.createdAt));

  const userIds = rows.map((r) => r.userId);
  const userMap = await loadUserMap(db, userIds);

  return c.json(
    ok(
      rows.map((r) => ({
        id: r.id,
        taskId: r.taskId,
        userId: r.userId,
        username: userMap.get(r.userId)?.username ?? "",
        nickname: userMap.get(r.userId)?.nickname ?? "",
        action: r.action,
        changes: r.changes,
        createdAt: r.createdAt.getTime(),
      })),
    ),
  );
});

// ── GET /tasks/:id/comments ──
taskRoutes.get("/:id/comments", async (c) => {
  const teamId = c.get("teamId")!;
  const taskId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(taskId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的任務 ID"), 400);
  }

  const t = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)),
    columns: { id: true },
  });
  if (!t) {
    return c.json(fail("NOT_FOUND", "任務不存在"), 404);
  }

  const rows = await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt));

  const userIds = rows.map((r) => r.userId);
  const userMap = await loadUserMap(db, userIds);

  return c.json(
    ok(
      rows.map((r) => ({
        id: r.id,
        teamId: r.teamId,
        taskId: r.taskId,
        userId: r.userId,
        username: userMap.get(r.userId)?.username ?? "",
        nickname: userMap.get(r.userId)?.nickname ?? "",
        content: r.content,
        createdAt: r.createdAt.getTime(),
      })),
    ),
  );
});

// ── POST /tasks/:id/comments ──
taskRoutes.post(
  "/:id/comments",
  zValidator("json", createCommentSchema, zodErrorHook),
  async (c) => {
    const teamId = c.get("teamId")!;
    const userId = c.get("userId")!;
    const taskId = Number(c.req.param("id"));
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    if (Number.isNaN(taskId)) {
      return c.json(fail("VALIDATION_ERROR", "無效的任務 ID"), 400);
    }

    const t = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.teamId, teamId)),
      columns: { id: true },
    });
    if (!t) {
      return c.json(fail("NOT_FOUND", "任務不存在"), 404);
    }

    const [comment] = await db
      .insert(taskComments)
      .values({
        teamId,
        taskId,
        userId,
        content: body.content,
      })
      .returning();

    if (!comment) {
      return c.json(fail("INTERNAL", "新增留言失敗"), 500);
    }

    const userMap = await loadUserMap(db, [userId]);
    const u = userMap.get(userId);

    return c.json(
      ok({
        id: comment.id,
        teamId: comment.teamId,
        taskId: comment.taskId,
        userId: comment.userId,
        username: u?.username ?? "",
        nickname: u?.nickname ?? "",
        content: comment.content,
        createdAt: comment.createdAt.getTime(),
      }),
      201,
    );
  },
);
