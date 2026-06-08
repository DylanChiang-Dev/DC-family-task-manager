import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { updateProfileSchema } from "@ftm/shared";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { fail, ok } from "../lib/response";
import { zodErrorHook } from "../lib/zod-hook";
import { hashPassword, verifyPassword } from "../lib/password";

export const profileRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

profileRoutes.use("*", authMiddleware);

// ── GET /profile — 獲取個人資料 ──
profileRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return c.json(fail("NOT_FOUND", "用戶不存在"), 404);
  }

  return c.json(
    ok({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      currentTeamId: user.currentTeamId,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    }),
  );
});

// ── PATCH /profile — 更新個人資料 ──
profileRoutes.patch(
  "/",
  zValidator("json", updateProfileSchema, zodErrorHook),
  async (c) => {
    const userId = c.get("userId")!;
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) {
      return c.json(fail("NOT_FOUND", "用戶不存在"), 404);
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.nickname !== undefined) {
      updateData.nickname = body.nickname;
    }
    if (body.email !== undefined) {
      updateData.email = body.email;
    }
    if (body.newPassword) {
      // Validate old password
      const valid = await verifyPassword(body.currentPassword!, user.passwordHash);
      if (!valid) {
        return c.json(fail("UNAUTHORIZED", "當前密碼錯誤"), 401);
      }
      updateData.passwordHash = await hashPassword(body.newPassword);
    }

    if (Object.keys(updateData).length <= 1) {
      // Only updatedAt, no real changes
      return c.json(
        ok({
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          currentTeamId: user.currentTeamId,
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
        }),
      );
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return c.json(fail("INTERNAL", "更新失敗"), 500);
    }

    return c.json(
      ok({
        id: updated.id,
        username: updated.username,
        nickname: updated.nickname,
        email: updated.email,
        currentTeamId: updated.currentTeamId,
        createdAt: updated.createdAt.getTime(),
        updatedAt: updated.updatedAt.getTime(),
      }),
    );
  },
);
