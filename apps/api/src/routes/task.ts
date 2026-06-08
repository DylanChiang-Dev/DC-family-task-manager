import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createTaskSchema, updateTaskSchema, createCommentSchema } from "@ftm/shared";
import type { TaskResponse, TaskStatus } from "@ftm/shared";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { users, tasks, taskComments, taskHistory, notifications, categories } from "../db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { teamMiddleware } from "../middleware/team";
import { fail, ok } from "../lib/response";
import { zodErrorHook } from "../lib/zod-hook";

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
    completedAt: t.completedAt?.getTime?.() ?? null,
    createdAt: t.createdAt.getTime(),
    updatedAt: t.updatedAt.getTime(),
  };
}

// ── GET /tasks ──
taskRoutes.get("/", async (c) => {
  const teamId = c.get("teamId")!;
  const db = createDb(c.env.DB);
  const statusParam = c.req.query("status");

  const validStatuses: TaskStatus[] = ["pending", "in_progress", "completed", "cancelled"];
  const status = validStatuses.includes(statusParam as TaskStatus) ? (statusParam as TaskStatus) : null;

  const rows = status
    ? await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.teamId, teamId), eq(tasks.status, status)))
        .orderBy(desc(tasks.createdAt))
    : await db
        .select()
        .from(tasks)
        .where(eq(tasks.teamId, teamId))
        .orderBy(desc(tasks.createdAt));

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

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
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
    }
  }
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate;
    changes.dueDate = body.dueDate;
  }
  if (body.taskType !== undefined && body.taskType !== existing.taskType) {
    updateData.taskType = body.taskType;
    changes.taskType = body.taskType;
  }
  if (body.recurrenceConfig !== undefined) {
    updateData.recurrenceConfig = body.recurrenceConfig;
    changes.recurrenceConfig = body.recurrenceConfig;
  }
  if (body.parentTaskId !== undefined && body.parentTaskId !== existing.parentTaskId) {
    updateData.parentTaskId = body.parentTaskId;
    changes.parentTaskId = body.parentTaskId;
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
          content: `任務「${body.title ?? existing.title}」狀態已變更為 ${body.status ?? existing.status}`,
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
taskRoutes.delete("/:id", async (c) => {
  const teamId = c.get("teamId")!;
  const userId = c.get("userId")!;
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
