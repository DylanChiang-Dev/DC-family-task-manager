import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createScheduleBlockSchema,
  updateScheduleBlockSchema,
  type ScheduleBlockResponse,
} from "@ftm/shared";
import { and, eq, gte, lte } from "drizzle-orm";
import type { Env, Variables } from "../types";
import { createDb } from "../db/client";
import { scheduleBlocks } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { fail, ok } from "../lib/response";
import { zodErrorHook } from "../lib/zod-hook";

export const scheduleBlockRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

scheduleBlockRoutes.use("*", authMiddleware);

const rangeQuerySchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((data, ctx) => {
    if (data.end < data.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end"],
        message: "結束日期不能早於開始日期",
      });
    }
  });

function shapeScheduleBlock(row: typeof scheduleBlocks.$inferSelect): ScheduleBlockResponse {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    location: row.location,
    startDate: row.startDate,
    endDate: row.endDate,
    color: row.color,
    note: row.note,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

scheduleBlockRoutes.get("/", zValidator("query", rangeQuerySchema, zodErrorHook), async (c) => {
  const userId = c.get("userId")!;
  const { start, end } = c.req.valid("query");
  const db = createDb(c.env.DB);

  const rows = await db
    .select()
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.userId, userId), lte(scheduleBlocks.startDate, end), gte(scheduleBlocks.endDate, start)));

  return c.json(ok(rows.map(shapeScheduleBlock)));
});

scheduleBlockRoutes.post("/", zValidator("json", createScheduleBlockSchema, zodErrorHook), async (c) => {
  const userId = c.get("userId")!;
  const input = c.req.valid("json");
  const db = createDb(c.env.DB);

  const [row] = await db
    .insert(scheduleBlocks)
    .values({
      userId,
      title: input.title,
      location: input.location ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      color: input.color,
      note: input.note ?? null,
    })
    .returning();

  return c.json(ok(shapeScheduleBlock(row)), 201);
});

scheduleBlockRoutes.patch("/:id", zValidator("json", updateScheduleBlockSchema, zodErrorHook), async (c) => {
  const userId = c.get("userId")!;
  const id = Number(c.req.param("id"));
  const input = c.req.valid("json");
  const db = createDb(c.env.DB);

  if (Number.isNaN(id)) {
    return c.json(fail("VALIDATION_ERROR", "無效的行程 ID"), 400);
  }

  const existing = await db.query.scheduleBlocks.findFirst({
    where: and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, userId)),
  });

  if (!existing) {
    return c.json(fail("NOT_FOUND", "行程不存在"), 404);
  }

  const [row] = await db
    .update(scheduleBlocks)
    .set({
      ...input,
      location: input.location === undefined ? existing.location : input.location,
      note: input.note === undefined ? existing.note : input.note,
      updatedAt: new Date(),
    })
    .where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, userId)))
    .returning();

  return c.json(ok(shapeScheduleBlock(row)));
});

scheduleBlockRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = Number(c.req.param("id"));
  const db = createDb(c.env.DB);

  if (Number.isNaN(id)) {
    return c.json(fail("VALIDATION_ERROR", "無效的行程 ID"), 400);
  }

  const existing = await db.query.scheduleBlocks.findFirst({
    where: and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, userId)),
    columns: { id: true },
  });

  if (!existing) {
    return c.json(fail("NOT_FOUND", "行程不存在"), 404);
  }

  await db.delete(scheduleBlocks).where(and(eq(scheduleBlocks.id, id), eq(scheduleBlocks.userId, userId)));

  return c.json(ok({ message: "行程已刪除" }));
});
