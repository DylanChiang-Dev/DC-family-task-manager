import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createTeamSchema,
  joinTeamSchema,
  switchTeamSchema,
  updateTeamSchema,
} from "@ftm/shared";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { users, teams, teamMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { generateInviteCode } from "../lib/invite-code";
import { authMiddleware } from "../middleware/auth";
import { teamMiddleware, requireAdmin } from "../middleware/team";
import { fail, ok } from "../lib/response";
import { zodErrorHook } from "../lib/zod-hook";

export const teamRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

teamRoutes.use("*", authMiddleware);

// S-04: 驗證 URL param :id 與 header X-Team-Id 一致的 helper
function validateTeamIdParam(c: { req: { param: (name: string) => string }; get: (key: string) => unknown; json: (body: unknown, status: number) => Response }): number | Response {
  const paramId = Number(c.req.param("id"));
  const headerTeamId = c.get("teamId") as number;
  if (Number.isNaN(paramId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的團隊 ID"), 400);
  }
  if (paramId !== headerTeamId) {
    return c.json(fail("VALIDATION_ERROR", "URL 中的團隊 ID 與 X-Team-Id header 不一致"), 400);
  }
  return paramId;
}

// ── 共用：查詢用戶的所有團隊（L-01 抽取重複邏輯）──
async function loadUserTeams(db: ReturnType<typeof createDb>, userId: number) {
  const memberRows = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
  });

  if (memberRows.length === 0) return [];

  // 批量查詢所有相關 team，避免 N+1
  const teamIds = memberRows.map((m) => m.teamId);
  const teamRows = await db.query.teams.findMany({
    where: (t, { inArray }) => inArray(t.id, teamIds),
  });
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  // M-02: 批量計算 memberCount（一次查詢所有團隊的成員數）
  const allMembers = await db.query.teamMembers.findMany({
    where: (tm, { inArray }) => inArray(tm.teamId, teamIds),
    columns: { teamId: true },
  });
  const countMap = new Map<number, number>();
  for (const m of allMembers) {
    countMap.set(m.teamId, (countMap.get(m.teamId) ?? 0) + 1);
  }

  return memberRows
    .map((m) => {
      const t = teamMap.get(m.teamId);
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        role: m.role,
        memberCount: countMap.get(t.id) ?? 0,
        createdAt: t.createdAt.getTime(),
      };
    })
    .filter(Boolean) as {
      id: number;
      name: string;
      inviteCode: string;
      role: string;
      memberCount: number;
      createdAt: number;
    }[];
}

// ── GET /teams — 我的所有團隊 ──
teamRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const teamsList = await loadUserTeams(db, userId);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return c.json(
    ok({
      teams: teamsList,
      currentTeamId: user?.currentTeamId ?? null,
    }),
  );
});

// ── POST /teams — 創建團隊 ──
teamRoutes.post("/", zValidator("json", createTeamSchema, zodErrorHook), async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return c.json(fail("NOT_FOUND", "用戶不存在"), 404);
  }

  let inviteCode = "";
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    inviteCode = generateInviteCode();
    const dup = await db.query.teams.findFirst({
      where: eq(teams.inviteCode, inviteCode),
    });
    if (!dup) break;
    if (attempt === MAX_RETRIES - 1) {
      return c.json(fail("INTERNAL", "無法生成唯一邀請碼"), 500);
    }
  }

  const [team] = await db
    .insert(teams)
    .values({
      name: body.name,
      inviteCode,
      createdBy: userId,
    })
    .returning({ id: teams.id, name: teams.name, inviteCode: teams.inviteCode, createdAt: teams.createdAt });

  if (!team) {
    return c.json(fail("INTERNAL", "創建團隊失敗"), 500);
  }

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId,
    role: "admin",
  });

  await db
    .update(users)
    .set({ currentTeamId: team.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json(
    ok({
      id: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
      role: "admin",
      createdAt: team.createdAt.getTime(),
    }),
    201,
  );
});

// ── POST /teams/join — 加入團隊 ──
teamRoutes.post("/join", zValidator("json", joinTeamSchema, zodErrorHook), async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const team = await db.query.teams.findFirst({
    where: eq(teams.inviteCode, body.inviteCode),
  });
  if (!team) {
    return c.json(fail("NOT_FOUND", "邀請碼無效"), 404);
  }

  const existing = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, team.id),
      eq(teamMembers.userId, userId),
    ),
  });
  if (existing) {
    return c.json(fail("CONFLICT", "你已經是該團隊成員"), 409);
  }

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId,
    role: "member",
  });

  await db
    .update(users)
    .set({ currentTeamId: team.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json(
    ok({
      id: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
      role: "member",
      createdAt: team.createdAt.getTime(),
    }),
    200,
  );
});

// ── POST /teams/switch — 切換當前團隊 ──
teamRoutes.post("/switch", zValidator("json", switchTeamSchema, zodErrorHook), async (c) => {
  const body = c.req.valid("json");
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const member = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, body.teamId),
      eq(teamMembers.userId, userId),
    ),
  });
  if (!member) {
    return c.json(fail("FORBIDDEN", "你不是該團隊成員"), 403);
  }

  await db
    .update(users)
    .set({ currentTeamId: body.teamId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json(ok({ currentTeamId: body.teamId }));
});

// ── GET /teams/:id — 團隊詳情 ──
teamRoutes.get("/:id", teamMiddleware, async (c) => {
  // S-04: 驗證 URL param 與 header 一致
  const result = validateTeamIdParam(c);
  if (result instanceof Response) return result;
  const teamId = result;

  const memberRole = c.get("memberRole")!;
  const db = createDb(c.env.DB);

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) {
    return c.json(fail("NOT_FOUND", "團隊不存在"), 404);
  }

  return c.json(
    ok({
      id: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
      createdBy: team.createdBy,
      role: memberRole,
      createdAt: team.createdAt.getTime(),
      updatedAt: team.updatedAt.getTime(),
    }),
  );
});

// ── GET /teams/:id/members — 團隊成員列表 ──
teamRoutes.get("/:id/members", teamMiddleware, async (c) => {
  const result = validateTeamIdParam(c);
  if (result instanceof Response) return result;
  const teamId = result;

  const db = createDb(c.env.DB);

  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    orderBy: (tm, { asc }) => [asc(tm.joinedAt)],
  });

  const userIds = members.map((m) => m.userId);
  // 批量查用戶避免 N+1
  const userRows = userIds.length > 0
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, userIds),
        columns: { id: true, username: true, nickname: true },
      })
    : [];
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return c.json(
    ok(
      members.map((m) => {
        const u = userMap.get(m.userId);
        return {
          id: m.id,
          teamId: m.teamId,
          userId: m.userId,
          username: u?.username ?? "",
          nickname: u?.nickname ?? "",
          role: m.role,
          joinedAt: m.joinedAt.getTime(),
        };
      }),
    ),
  );
});

// ── PATCH /teams/:id — 更新團隊（改名）─
teamRoutes.patch(
  "/:id",
  teamMiddleware,
  requireAdmin,
  zValidator("json", updateTeamSchema, zodErrorHook),
  async (c) => {
    const result = validateTeamIdParam(c);
    if (result instanceof Response) return result;
    const teamId = result;

    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    if (!body.name) {
      return c.json(fail("VALIDATION_ERROR", "團隊名稱不能為空"), 400);
    }

    const [updated] = await db
      .update(teams)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning({ id: teams.id, name: teams.name, updatedAt: teams.updatedAt });

    if (!updated) {
      return c.json(fail("NOT_FOUND", "團隊不存在"), 404);
    }

    return c.json(ok({ id: updated.id, name: updated.name, updatedAt: updated.updatedAt.getTime() }));
  },
);

// ── POST /teams/:id/invite-code — 重新生成邀請碼 ──
teamRoutes.post("/:id/invite-code", teamMiddleware, requireAdmin, async (c) => {
  const result = validateTeamIdParam(c);
  if (result instanceof Response) return result;
  const teamId = result;

  const db = createDb(c.env.DB);

  let newCode = "";
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    newCode = generateInviteCode();
    const dup = await db.query.teams.findFirst({
      where: eq(teams.inviteCode, newCode),
    });
    if (!dup) break;
    if (attempt === MAX_RETRIES - 1) {
      return c.json(fail("INTERNAL", "無法生成唯一邀請碼"), 500);
    }
  }

  await db
    .update(teams)
    .set({ inviteCode: newCode, updatedAt: new Date() })
    .where(eq(teams.id, teamId));

  return c.json(ok({ inviteCode: newCode }));
});

// ── DELETE /teams/:id/members/:memberId — 移除成員 ──
// L-06: URL param 改名為 :memberId 避免與登錄 userId 混淆
teamRoutes.delete("/:id/members/:memberId", teamMiddleware, requireAdmin, async (c) => {
  const result = validateTeamIdParam(c);
  if (result instanceof Response) return result;
  const teamId = result;

  const userId = c.get("userId")!;
  const targetUserId = Number(c.req.param("memberId"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(targetUserId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的用戶 ID"), 400);
  }

  // 禁止管理員移除自己
  if (targetUserId === userId) {
    return c.json(fail("FORBIDDEN", "管理員不能移除自己"), 403);
  }

  const target = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, targetUserId),
    ),
  });
  if (!target) {
    return c.json(fail("NOT_FOUND", "該用戶不是團隊成員"), 404);
  }

  await db
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId),
      ),
    );

  // 如果被移除的用戶當前團隊是這個團隊，清除
  await db
    .update(users)
    .set({ currentTeamId: null, updatedAt: new Date() })
    .where(
      and(
        eq(users.id, targetUserId),
        eq(users.currentTeamId, teamId),
      ),
    );

  return c.json(ok({ message: "成員已移除" }));
});

// ── DELETE /teams/:id — 刪除團隊 ──
teamRoutes.delete("/:id", teamMiddleware, requireAdmin, async (c) => {
  const result = validateTeamIdParam(c);
  if (result instanceof Response) return result;
  const teamId = result;

  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  // 檢查團隊人數
  const memberCount = await db.$count(teamMembers, eq(teamMembers.teamId, teamId));
  if (memberCount > 1) {
    return c.json(fail("FORBIDDEN", "團隊仍有其他成員，無法刪除"), 403);
  }

  await db.delete(teams).where(eq(teams.id, teamId));

  // M-03: 刪除團隊後清除 admin 的 currentTeamId
  await db
    .update(users)
    .set({ currentTeamId: null, updatedAt: new Date() })
    .where(
      and(
        eq(users.id, userId),
        eq(users.currentTeamId, teamId),
      ),
    );

  return c.json(ok({ message: "團隊已刪除" }));
});
