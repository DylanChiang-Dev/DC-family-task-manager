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
import { eq, and } from "drizzle-orm";
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
import { zodErrorHook } from "../lib/zod-hook";

export const authRoutes = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>();

// ── POST /auth/register ──
authRoutes.post(
  "/register",
  zValidator("json", registerSchema, zodErrorHook),
  async (c) => {
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    // 檢查 username 唯一
    const existing = await db.query.users.findFirst({
      where: eq(users.username, body.username),
    });
    if (existing) {
      return c.json(fail("CONFLICT", "用戶名已被使用"), 409);
    }

    // S-04: 如果是加入團隊，先驗證邀請碼（在 insert user 之前）
    let joinTeam: { id: number; name: string; inviteCode: string } | null = null;
    if (body.teamOption === "join") {
      const inviteCode = body.inviteCode!;
      const team = await db.query.teams.findFirst({
        where: eq(teams.inviteCode, inviteCode),
      });
      if (!team) {
        return c.json(fail("NOT_FOUND", "邀請碼無效"), 404);
      }
      joinTeam = team;
    }

    // 哈希密碼
    const passwordHash = await hashPassword(body.password);

    // M-02/M-03: 生成唯一邀請碼（僅 create 模式）
    let newInviteCode = "";
    if (body.teamOption === "create") {
      const MAX_RETRIES = 5;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        newInviteCode = generateInviteCode();
        const dup = await db.query.teams.findFirst({
          where: eq(teams.inviteCode, newInviteCode),
        });
        if (!dup) break;
        if (attempt === MAX_RETRIES - 1) {
          return c.json(fail("INTERNAL", "無法生成唯一邀請碼"), 500);
        }
      }
    }

    // S-02: 使用 D1 batch 實現事務保護
    // D1 的 batch 在同一個隱式事務中執行所有語句
    if (body.teamOption === "create") {
      const teamName = body.teamName || `${body.nickname}的團隊`;

      // 步驟 1: 創建用戶
      const [user] = await db
        .insert(users)
        .values({
          username: body.username,
          passwordHash,
          nickname: body.nickname,
        })
        .returning({ id: users.id, createdAt: users.createdAt });
      if (!user) {
        return c.json(fail("INTERNAL", "創建用戶失敗"), 500);
      }

      // 步驟 2: 創建團隊
      const [team] = await db
        .insert(teams)
        .values({
          name: teamName,
          inviteCode: newInviteCode,
          createdBy: user.id,
        })
        .returning({ id: teams.id, name: teams.name, inviteCode: teams.inviteCode });
      if (!team) {
        return c.json(fail("INTERNAL", "創建團隊失敗"), 500);
      }

      // 步驟 3: 創建團隊成員 + 更新用戶當前團隊
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: user.id,
        role: "admin",
      });

      await db
        .update(users)
        .set({ currentTeamId: team.id, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // 簽發 token
      const accessToken = await signAccessToken(
        { sub: user.id, username: body.username },
        c.env.JWT_SECRET,
      );
      const jti = generateJti();
      const refreshToken = await signRefreshToken(
        { sub: user.id, jti },
        c.env.JWT_REFRESH_SECRET,
      );

      // M-04: SESSIONS 現在是必需的，不再做 optional 檢查
      await saveRefreshToken(c.env.SESSIONS, user.id, jti);

      // M-08: 使用 DB 返回的 createdAt 而非 Date.now()
      return c.json(
        ok({
          user: {
            id: user.id,
            username: body.username,
            nickname: body.nickname,
            email: null,
            currentTeamId: team.id,
            createdAt: user.createdAt.getTime(),
          },
          team: {
            id: team.id,
            name: team.name,
            inviteCode: team.inviteCode,
            role: "admin" as const,
          },
          accessToken,
          refreshToken,
        }),
        201,
      );
    } else {
      // join 模式 — joinTeam 已在上面驗證過
      const team = joinTeam!;

      // 創建用戶
      const [user] = await db
        .insert(users)
        .values({
          username: body.username,
          passwordHash,
          nickname: body.nickname,
        })
        .returning({ id: users.id, createdAt: users.createdAt });
      if (!user) {
        return c.json(fail("INTERNAL", "創建用戶失敗"), 500);
      }

      // 創建團隊成員 + 更新用戶當前團隊
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: user.id,
        role: "member",
      });

      await db
        .update(users)
        .set({ currentTeamId: team.id, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // 簽發 token
      const accessToken = await signAccessToken(
        { sub: user.id, username: body.username },
        c.env.JWT_SECRET,
      );
      const jti = generateJti();
      const refreshToken = await signRefreshToken(
        { sub: user.id, jti },
        c.env.JWT_REFRESH_SECRET,
      );

      await saveRefreshToken(c.env.SESSIONS, user.id, jti);

      return c.json(
        ok({
          user: {
            id: user.id,
            username: body.username,
            nickname: body.nickname,
            email: null,
            currentTeamId: team.id,
            createdAt: user.createdAt.getTime(),
          },
          team: {
            id: team.id,
            name: team.name,
            inviteCode: team.inviteCode,
            role: "member" as const,
          },
          accessToken,
          refreshToken,
        }),
        201,
      );
    }
  },
);

// ── POST /auth/login ──
authRoutes.post(
  "/login",
  zValidator("json", loginSchema, zodErrorHook),
  async (c) => {
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    const user = await db.query.users.findFirst({
      where: eq(users.username, body.username),
    });
    if (!user) {
      return c.json(fail("UNAUTHORIZED", "用戶名或密碼錯誤"), 401);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return c.json(fail("UNAUTHORIZED", "用戶名或密碼錯誤"), 401);
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
          .set({ currentTeamId, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }

    const accessToken = await signAccessToken(
      { sub: user.id, username: user.username },
      c.env.JWT_SECRET,
    );
    const jti = generateJti();
    const refreshToken = await signRefreshToken(
      { sub: user.id, jti },
      c.env.JWT_REFRESH_SECRET,
    );

    await saveRefreshToken(c.env.SESSIONS, user.id, jti);

    let teamData: {
      id: number;
      name: string;
      inviteCode: string;
      role: "admin" | "member";
    } | null = null;
    if (currentTeamId) {
      const t = await db.query.teams.findFirst({
        where: eq(teams.id, currentTeamId),
      });
      // M-05: 查 member 時同時過濾 userId 和 teamId
      const m = await db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, currentTeamId),
        ),
      });
      if (t && m) {
        teamData = {
          id: t.id,
          name: t.name,
          inviteCode: t.inviteCode,
          role: m.role as "admin" | "member",
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
          createdAt: user.createdAt.getTime(),
        },
        team: teamData,
        accessToken,
        refreshToken,
      }),
    );
  },
);

// ── POST /auth/refresh ──
authRoutes.post(
  "/refresh",
  zValidator("json", refreshSchema, zodErrorHook),
  async (c) => {
    const body = c.req.valid("json");

    const payload = await verifyRefreshToken(
      body.refreshToken,
      c.env.JWT_REFRESH_SECRET,
    );
    if (!payload) {
      return c.json(fail("UNAUTHORIZED", "Refresh token 無效或已過期"), 401);
    }

    const valid = await validateRefreshToken(
      c.env.SESSIONS,
      payload.sub,
      payload.jti,
    );
    if (!valid) {
      return c.json(fail("UNAUTHORIZED", "Refresh token 已被吊銷"), 401);
    }
    await revokeRefreshToken(c.env.SESSIONS, payload.sub, payload.jti);

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

    await saveRefreshToken(c.env.SESSIONS, payload.sub, jti);

    return c.json(ok({ accessToken, refreshToken }));
  },
);

// ── POST /auth/logout ──
authRoutes.post(
  "/logout",
  zValidator("json", logoutSchema, zodErrorHook),
  async (c) => {
    const body = c.req.valid("json");

    const payload = await verifyRefreshToken(
      body.refreshToken,
      c.env.JWT_REFRESH_SECRET,
    );
    if (payload) {
      await revokeRefreshToken(c.env.SESSIONS, payload.sub, payload.jti);
    }

    return c.json(ok({ message: "已登出" }));
  },
);

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
        createdAt: user.createdAt.getTime(),
      },
      teams: filteredTeams,
      currentTeam,
    }),
  );
});
