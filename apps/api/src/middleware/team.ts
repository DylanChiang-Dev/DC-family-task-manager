import type { MiddlewareHandler } from "hono";
import { createDb } from "../db/client";
import { teamMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { Env, Variables } from "../types";

// 團隊上下文中間件：從 X-Team-Id 頭取團隊 ID，驗證用戶是否為該團隊成員
export const teamMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "未登錄" },
      },
      401,
    );
  }

  const teamIdHeader = c.req.header("X-Team-Id");
  if (!teamIdHeader) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "未選擇團隊" },
      },
      400,
    );
  }

  const teamId = Number(teamIdHeader);
  if (Number.isNaN(teamId)) {
    return c.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "無效的團隊 ID" },
      },
      400,
    );
  }

  const db = createDb(c.env.DB);
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
    ),
  });

  if (!member) {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "你不是該團隊成員" },
      },
      403,
    );
  }

  c.set("teamId", teamId);
  await next();
};

// 管理員角色校驗中間件（需在 teamMiddleware 之後使用）
export const requireAdmin: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const userId = c.get("userId");
  const teamId = c.get("teamId");
  if (!userId || !teamId) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "未登錄或未選擇團隊" },
      },
      401,
    );
  }

  const db = createDb(c.env.DB);
  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
    ),
  });

  if (!member || member.role !== "admin") {
    return c.json(
      {
        success: false,
        error: { code: "FORBIDDEN", message: "需要管理員權限" },
      },
      403,
    );
  }

  await next();
};
