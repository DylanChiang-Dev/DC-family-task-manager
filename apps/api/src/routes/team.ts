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

// ── GET /teams — 我的所有團隊 ──
teamRoutes.get("/", async (c) => {
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const memberRows = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
  });

  const teamsList = await Promise.all(
    memberRows.map(async (m) => {
      const t = await db.query.teams.findFirst({
        where: eq(teams.id, m.teamId),
      });
      if (!t) return null;
      return {
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        role: m.role,
        memberCount: 0,
        createdAt: t.createdAt.getTime(),
      };
    }),
  );

  const filtered = teamsList.filter(Boolean) as NonNullable<(typeof teamsList)[number]>[];

  for (const team of filtered) {
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, team.id),
    });
    team.memberCount = members.length;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  return c.json(
    ok({
      teams: filtered,
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
  const teamId = c.get("teamId")!;
  const userId = c.get("userId")!;
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
  const teamId = c.get("teamId")!;
  const db = createDb(c.env.DB);

  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    orderBy: (tm, { asc }) => [asc(tm.joinedAt)],
  });

  const result = await Promise.all(
    members.map(async (m) => {
      const u = await db.query.users.findFirst({
        where: eq(users.id, m.userId),
        columns: { id: true, username: true, nickname: true },
      });
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
  );

  return c.json(ok(result));
});

// ── PATCH /teams/:id — 更新團隊（改名）─
teamRoutes.patch(
  "/:id",
  teamMiddleware,
  requireAdmin,
  zValidator("json", updateTeamSchema, zodErrorHook),
  async (c) => {
    const teamId = c.get("teamId")!;
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
  const teamId = c.get("teamId")!;
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

// ── DELETE /teams/:id/members/:userId — 移除成員 ──
teamRoutes.delete("/:id/members/:userId", teamMiddleware, requireAdmin, async (c) => {
  const teamId = c.get("teamId")!;
  const userId = c.get("userId")!;
  const targetUserId = Number(c.req.param("userId"));
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
  const teamId = c.get("teamId")!;
  const db = createDb(c.env.DB);

  // 檢查團隊人數
  const memberCount = await db.$count(teamMembers, eq(teamMembers.teamId, teamId));
  if (memberCount > 1) {
    return c.json(fail("FORBIDDEN", "團隊仍有其他成員，無法刪除"), 403);
  }

  await db.delete(teams).where(eq(teams.id, teamId));

  return c.json(ok({ message: "團隊已刪除" }));
});
