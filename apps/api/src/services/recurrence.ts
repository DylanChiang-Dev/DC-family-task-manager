import type { Env } from "../types";
import { createDb } from "../db/client";
import { tasks } from "../db/schema";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { computeOccurrences, nextOccurrenceAfter } from "@ftm/shared";
import type { RecurrenceConfig } from "@ftm/shared";

const HORIZON_YEARS = 3;

function todayISO(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function horizonISO(now: Date): string {
  const end = new Date(now);
  end.setUTCFullYear(end.getUTCFullYear() + HORIZON_YEARS);
  return todayISO(end);
}

/** 算出某模板「應該存在」的所有 dueDate（近 3 年窗 + 保底至少 1 筆） */
export function targetDatesFor(config: RecurrenceConfig, now: Date): string[] {
  const from = todayISO(now);
  const to = horizonISO(now);
  const occ = computeOccurrences(config, from, to);
  if (occ.length > 0) return occ;
  const next = nextOccurrenceAfter(config, from);
  return next ? [next] : [];
}

type DbClient = ReturnType<typeof createDb>;

/**
 * 為單一模板補齊缺少的實例。回傳新建立的筆數。
 * @param template 一筆 recurring 且 parentTaskId 為 null 的 task row
 */
export async function generateInstancesForTemplate(
  db: DbClient,
  template: typeof tasks.$inferSelect,
  now: Date,
): Promise<number> {
  if (template.taskType !== "recurring" || template.parentTaskId != null) return 0;
  if (!template.recurrenceConfig) return 0;

  const wanted = targetDatesFor(template.recurrenceConfig, now);
  if (wanted.length === 0) return 0;

  // 既有實例的 dueDate 集合
  const existing = await db
    .select({ dueDate: tasks.dueDate })
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, template.id), isNotNull(tasks.dueDate)));
  const existingSet = new Set(existing.map((r) => r.dueDate));

  const toInsert = wanted
    .filter((d) => !existingSet.has(d))
    .map((d) => ({
      teamId: template.teamId,
      title: template.title,
      description: template.description,
      creatorId: template.creatorId,
      assigneeId: template.assigneeId,
      categoryId: template.categoryId,
      priority: template.priority,
      status: "pending" as const,
      dueDate: d,
      taskType: "recurring" as const,
      recurrenceConfig: null,
      parentTaskId: template.id,
    }));

  if (toInsert.length === 0) return 0;
  await db.insert(tasks).values(toInsert);
  return toInsert.length;
}

/** 掃描所有 recurring 模板並補齊實例（cron 用）。 */
export async function generateAllRecurringInstances(env: Env, now = new Date()): Promise<void> {
  try {
    const db = createDb(env.DB);
    const templates = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.taskType, "recurring"), isNull(tasks.parentTaskId)));

    console.log(`[recurrence] ${templates.length} templates to expand`);
    let total = 0;
    for (const tpl of templates) {
      total += await generateInstancesForTemplate(db, tpl, now);
    }
    console.log(`[recurrence] generated ${total} instances`);
  } catch (err) {
    console.error("[recurrence] generateAllRecurringInstances error:", err);
  }
}
