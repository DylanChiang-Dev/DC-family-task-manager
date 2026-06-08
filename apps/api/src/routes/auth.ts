import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "@ftm/shared";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { users, teams, teamMembers } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateInviteCode } from "../lib/invite-code";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateJti,
} from "../lib/jwt";
import {
  saveRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
} from "../lib/kv-session";
import { authMiddleware } from "../middleware/auth";
import { fail, ok } from "../lib/response";

export const authRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

// ── POST /auth/register ──
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const body = c.req.valid("json");
  const db = createDb(c.env.DB);

  // 檢查 username 唯一
  const existing = await db.query.users.findFirst({
    where: eq(users.username, body.username),
  });
  if (existing) {
    return c.json(fail("CONFLICT", "用戶名已被使用"), 409);
  }

  // 哈希密碼
  const passwordHash = await hashPassword(body.password);

  // 事務：創建用戶 + 團隊 + 團隊成員
  try {
    const result = await db.transaction(async (tx) => {
      // 1. 創建用戶
      const [user] = await tx
        .insert(users)
        .values({
          username: body.username,
          passwordHash,
          nickname: body.nickname,
        })
        .returning({ id: users.id });
      if (!user) throw new Error("創建用戶失敗");

      let teamId: number;
      let role: "admin" | "member" = "member";

      if (body.teamOption === "create") {
        // 創建團隊
        const teamName = body.teamName || `${body.nickname}的團隊`;
        let inviteCode: string;
        // 重試直到生成唯一邀請碼
        for (let i = 0; i < 5; i++) {
          inviteCode = generateInviteCode();
          const dup = await tx.query.teams.findFirst({
            where: eq(teams.inviteCode, inviteCode),
          });
          if (!dup) break;
          if (i === 4) throw new Error("無法生成唯一邀請碼");
        }
        const [team] = await tx
          .insert(teams)
          .values({
            name: teamName,
            inviteCode: inviteCode!,
            createdBy: user.id,
          })
          .returning({ id: teams.id });
        if (!team) throw new Error("創建團隊失敗");
        teamId = team.id;
        role = "admin";
      } else {
        // 加入團隊
        const inviteCode = body.inviteCode!;
        const team = await tx.query.teams.findFirst({
          where: eq(teams.inviteCode, inviteCode),
        });
        if (!team) {
          throw new Error("INVITE_NOT_FOUND");
        }
        teamId = team.id;
      }

      // 2. 創建團隊成員關聯
      await tx.insert(teamMembers).values({
        teamId,
        userId: user.id,
        role,
      });

      // 3. 更新用戶 current_team_id
      await tx
        .update(users)
        .set({ currentTeamId: teamId })
        .where(eq(users.id, user.id));

      return { userId: user.id, teamId, role };
    });

    // 簽發 token
    const accessToken = await signAccessToken(
      { sub: result.userId, username: body.username },
      c.env.JWT_SECRET,
    );
    const jti = generateJti();
    const refreshToken = await signRefreshToken(
      { sub: result.userId, jti },
      c.env.JWT_REFRESH_SECRET,
    );

    // 存 KV
    if (c.env.SESSIONS) {
      await saveRefreshToken(c.env.SESSIONS, result.userId, jti);
    }

    // 獲取團隊信息
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, result.teamId),
    });

    return c.json(
      ok({
        user: {
          id: result.userId,
          username: body.username,
          nickname: body.nickname,
          email: null,
          currentTeamId: result.teamId,
          createdAt: Date.now(),
        },
        team: {
          id: result.teamId,
          name: team!.name,
          inviteCode: team!.inviteCode,
          role: result.role,
        },
        accessToken,
        refreshToken,
      }),
      201,
    );
  } catch (err: any) {
    if (err.message === "INVITE_NOT_FOUND") {
      return c.json(fail("NOT_FOUND", "邀請碼無效或不存在"), 404);
    }
    throw err;
  }
});

// ── POST /auth/login ──
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const body = c.req.valid("json");
  const db = createDb(c.env.DB);

  // 查用戶
  const user = await db.query.users.findFirst({
    where: eq(users.username, body.username),
  });
  if (!user) {
    return c.json(
      fail("UNAUTHORIZED", "用戶名或密碼錯誤"),
      401,
    );
  }

  // 驗證密碼
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return c.json(
      fail("UNAUTHORIZED", "用戶名或密碼錯誤"),
      401,
    );
  }

  // 若無當前團隊，取最早加入的團隊補上
  let currentTeamId = user.currentTeamId;
  if (!currentTeamId) {
    const firstMember = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      orderBy: (tm, { asc }) => [asc(tm.joinedAt)],
    });
    if (firstMember) {
      currentTeamId = firstMember.teamId;
      await db
        .update(users)
        .set({ currentTeamId })
        .where(eq(users.id, user.id));
    }
  }

  // 簽發 token
  const accessToken = await signAccessToken(
    { sub: user.id, username: user.username },
    c.env.JWT_SECRET,
  );
  const jti = generateJti();
  const refreshToken = await signRefreshToken(
    { sub: user.id, jti },
    c.env.JWT_REFRESH_SECRET,
  );

  // 存 KV
  if (c.env.SESSIONS) {
    await saveRefreshToken(c.env.SESSIONS, user.id, jti);
  }

  // 團隊信息
  let team: { id: number; name: string; inviteCode: string; role: "admin" | "member" } | null = null;
  if (currentTeamId) {
    const t = await db.query.teams.findFirst({
      where: eq(teams.id, currentTeamId),
    });
    const m = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.userId, user.id),
      // 取當前團隊的角色 (teamMiddleware 場景)
    });
    if (t) {
      team = {
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        role: (m?.role as "admin" | "member") || "member",
      };
    }
  }

  return c.json(
    ok({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        currentTeamId,
        createdAt: user.createdAt,
      },
      team,
      accessToken,
      refreshToken,
    }),
  );
});

// ── POST /auth/refresh ──
authRoutes.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const body = c.req.valid("json");

  const payload = await verifyRefreshToken(
    body.refreshToken,
    c.env.JWT_REFRESH_SECRET,
  );
  if (!payload) {
    return c.json(
      fail("UNAUTHORIZED", "Refresh token 無效或已過期"),
      401,
    );
  }

  // KV 驗證
  if (c.env.SESSIONS) {
    const valid = await validateRefreshToken(
      c.env.SESSIONS,
      payload.sub,
      payload.jti,
    );
    if (!valid) {
      return c.json(
        fail("UNAUTHORIZED", "Refresh token 已被吊銷"),
        401,
      );
    }
    // 滾動刷新：吊銷舊的，簽發新的
    await revokeRefreshToken(c.env.SESSIONS, payload.sub, payload.jti);
  }

  // 查用戶名
  const db = createDb(c.env.DB);
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
    columns: { username: true },
  });

  const accessToken = await signAccessToken(
    { sub: payload.sub, username: user?.username ?? "" },
    c.env.JWT_SECRET,
  );
  const jti = generateJti();
  const refreshToken = await signRefreshToken(
    { sub: payload.sub, jti },
    c.env.JWT_REFRESH_SECRET,
  );

  if (c.env.SESSIONS) {
    await saveRefreshToken(c.env.SESSIONS, payload.sub, jti);
  }

  return c.json(ok({ accessToken, refreshToken }));
});

// ── POST /auth/logout ──
authRoutes.post("/logout", zValidator("json", logoutSchema), async (c) => {
  const body = c.req.valid("json");

  const payload = await verifyRefreshToken(
    body.refreshToken,
    c.env.JWT_REFRESH_SECRET,
  );
  if (payload && c.env.SESSIONS) {
    await revokeRefreshToken(c.env.SESSIONS, payload.sub, payload.jti);
  }

  return c.json(ok({ message: "已登出" }));
});

// ── GET /auth/me ──
authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("userId")!;
  const db = createDb(c.env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    return c.json(fail("NOT_FOUND", "用戶不存在"), 404);
  }

  // 查所有團隊
  const memberRows = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
  });

  // 用 memberRows 構建 team list
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
        role: m.role as "admin" | "member",
      };
    }),
  );

  const filteredTeams = teamsList.filter(Boolean) as NonNullable<
    (typeof teamsList)[number]
  >[];

  const currentTeam = user.currentTeamId
    ? filteredTeams.find((t) => t.id === user.currentTeamId) ?? null
    : null;

  return c.json(
    ok({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        currentTeamId: user.currentTeamId,
        createdAt: user.createdAt,
      },
      teams: filteredTeams,
      currentTeam,
    }),
  );
});
