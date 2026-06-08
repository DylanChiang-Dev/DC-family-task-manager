import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { notifications, users } from "../db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { fail, ok } from "../lib/response";

export const notificationRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

notificationRoutes.use("*", authMiddleware);

// ── GET /notifications — 我的通知列表 + 未讀數 ──
// Query: ?unreadOnly=true
notificationRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);
  const unreadOnly = c.req.query("unreadOnly") === "true";

  const clauses = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    clauses.push(eq(notifications.isRead, false));
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...clauses))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // M-01: 使用 COUNT 而非全量查詢
  const unreadCount = await db.$count(
    notifications,
    and(eq(notifications.userId, userId), eq(notifications.isRead, false)),
  );

  // Batch-load creator names
  const creatorIds = [...new Set(rows.map((n) => n.createdBy).filter(Boolean))] as number[];
  let userMap = new Map<number, { username: string; nickname: string }>();
  if (creatorIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, username: users.username, nickname: users.nickname })
      .from(users)
      .where(inArray(users.id, creatorIds));
    userMap = new Map(userRows.map((u) => [u.id, u]));
  }

  return c.json(
    ok({
      notifications: rows.map((n) => ({
        id: n.id,
        userId: n.userId,
        createdBy: n.createdBy,
        createdByName: n.createdBy ? (userMap.get(n.createdBy)?.username ?? null) : null,
        createdByNickname: n.createdBy ? (userMap.get(n.createdBy)?.nickname ?? null) : null,
        taskId: n.taskId,
        type: n.type,
        content: n.content,
        isRead: n.isRead,
        createdAt: n.createdAt.getTime(),
      })),
      unreadCount,
    }),
  );
});

// ── POST /notifications/:id/read — 標記已讀 ──
notificationRoutes.post("/:id/read", async (c) => {
  const userId = c.get("userId")!;
  const notifId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(notifId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的通知 ID"), 400);
  }

  const n = await db.query.notifications.findFirst({
    where: and(eq(notifications.id, notifId), eq(notifications.userId, userId)),
  });
  if (!n) {
    return c.json(fail("NOT_FOUND", "通知不存在"), 404);
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)));

  return c.json(ok({ message: "已標記為已讀" }));
});

// ── POST /notifications/read-all — 全部標記已讀 ──
notificationRoutes.post("/read-all", async (c) => {
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return c.json(ok({ message: "已全部標記為已讀" }));
});

// ── DELETE /notifications/:id — 刪除通知 ──
notificationRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")!;
  const notifId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(notifId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的通知 ID"), 400);
  }

  const n = await db.query.notifications.findFirst({
    where: and(eq(notifications.id, notifId), eq(notifications.userId, userId)),
  });
  if (!n) {
    return c.json(fail("NOT_FOUND", "通知不存在"), 404);
  }

  await db
    .delete(notifications)
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)));

  return c.json(ok({ message: "通知已刪除" }));
});
