import type { MiddlewareHandler } from "hono";
import { createDb } from "../db/client";
import { teamMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { Env, Variables } from "../types";
import { fail } from "../lib/response";

// 團隊上下文中間件：從 X-Team-Id 頭取團隊 ID，驗證用戶是否為該團隊成員
export const teamMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(fail("UNAUTHORIZED", "未登錄"), 401);
  }

  const teamIdHeader = c.req.header("X-Team-Id");
  if (!teamIdHeader) {
    return c.json(fail("VALIDATION_ERROR", "未選擇團隊"), 400);
  }

  const teamId = Number(teamIdHeader);
  if (Number.isNaN(teamId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的團隊 ID"), 400);
  }

  const db = createDb(c.env.DB);
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
    ),
  });

  if (!member) {
    return c.json(fail("FORBIDDEN", "你不是該團隊成員"), 403);
  }

  c.set("teamId", teamId);
  c.set("memberRole", member.role as "admin" | "member");
  await next();
};

// 管理員角色校驗中間件（需在 teamMiddleware 之後使用）
// 直接讀取 teamMiddleware 已緩存的 memberRole，避免重複查 DB
export const requireAdmin: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const memberRole = c.get("memberRole");
  if (memberRole !== "admin") {
    return c.json(fail("FORBIDDEN", "需要管理員權限"), 403);
  }
  await next();
};
