import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createCategorySchema, updateCategorySchema } from "@ftm/shared";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { categories } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { teamMiddleware, requireAdmin } from "../middleware/team";
import { fail, ok } from "../lib/response";
import { zodErrorHook } from "../lib/zod-hook";

export const categoryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

categoryRoutes.use("*", authMiddleware, teamMiddleware);

// ── GET /categories — 列出當前團隊分類 ──
categoryRoutes.get("/", async (c) => {
  const teamId = c.get("teamId")!;
  const db = createDb(c.env.DB);

  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.teamId, teamId))
    .orderBy(categories.createdAt);

  return c.json(
    ok(
      rows.map((r) => ({
        id: r.id,
        teamId: r.teamId,
        name: r.name,
        color: r.color,
        creatorId: r.creatorId,
        createdAt: r.createdAt.getTime(),
      })),
    ),
  );
});

// ── POST /categories — 創建分類（admin）─
categoryRoutes.post(
  "/",
  requireAdmin,
  zValidator("json", createCategorySchema, zodErrorHook),
  async (c) => {
    const teamId = c.get("teamId")!;
    const userId = c.get("userId")!;
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    // Check duplicate name within team
    const existing = await db.query.categories.findFirst({
      where: and(eq(categories.teamId, teamId), eq(categories.name, body.name)),
    });
    if (existing) {
      return c.json(fail("CONFLICT", "分類名已存在"), 409);
    }

    const [cat] = await db
      .insert(categories)
      .values({
        teamId,
        name: body.name,
        color: body.color,
        creatorId: userId,
      })
      .returning();

    if (!cat) {
      return c.json(fail("INTERNAL", "創建分類失敗"), 500);
    }

    return c.json(
      ok({
        id: cat.id,
        teamId: cat.teamId,
        name: cat.name,
        color: cat.color,
        creatorId: cat.creatorId,
        createdAt: cat.createdAt.getTime(),
      }),
      201,
    );
  },
);

// ── PATCH /categories/:id — 更新分類（admin）─
categoryRoutes.patch(
  "/:id",
  requireAdmin,
  zValidator("json", updateCategorySchema, zodErrorHook),
  async (c) => {
    const teamId = c.get("teamId")!;
    const catId = Number(c.req.param("id"));
    const body = c.req.valid("json");
    const db = createDb(c.env.DB);

    if (Number.isNaN(catId)) {
      return c.json(fail("VALIDATION_ERROR", "無效的分類 ID"), 400);
    }

    const existing = await db.query.categories.findFirst({
      where: and(eq(categories.id, catId), eq(categories.teamId, teamId)),
    });
    if (!existing) {
      return c.json(fail("NOT_FOUND", "分類不存在"), 404);
    }

    // If renaming, check duplicate
    if (body.name && body.name !== existing.name) {
      const dup = await db.query.categories.findFirst({
        where: and(eq(categories.teamId, teamId), eq(categories.name, body.name)),
      });
      if (dup) {
        return c.json(fail("CONFLICT", "分類名已存在"), 409);
      }
    }

    const updateData: Partial<typeof categories.$inferInsert> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;

    if (Object.keys(updateData).length === 0) {
      return c.json(
        ok({
          id: existing.id,
          teamId: existing.teamId,
          name: existing.name,
          color: existing.color,
          creatorId: existing.creatorId,
          createdAt: existing.createdAt.getTime(),
        }),
      );
    }

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(and(eq(categories.id, catId), eq(categories.teamId, teamId)))
      .returning();

    if (!updated) {
      return c.json(fail("INTERNAL", "更新分類失敗"), 500);
    }

    return c.json(
      ok({
        id: updated.id,
        teamId: updated.teamId,
        name: updated.name,
        color: updated.color,
        creatorId: updated.creatorId,
        createdAt: updated.createdAt.getTime(),
      }),
    );
  },
);

// ── DELETE /categories/:id — 刪除分類（admin）─
categoryRoutes.delete("/:id", requireAdmin, async (c) => {
  const teamId = c.get("teamId")!;
  const catId = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(catId)) {
    return c.json(fail("VALIDATION_ERROR", "無效的分類 ID"), 400);
  }

  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.id, catId), eq(categories.teamId, teamId)),
  });
  if (!existing) {
    return c.json(fail("NOT_FOUND", "分類不存在"), 404);
  }

  await db
    .delete(categories)
    .where(and(eq(categories.id, catId), eq(categories.teamId, teamId)));

  return c.json(ok({ message: "分類已刪除" }));
});
