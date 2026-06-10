import type { Env } from "../types";
import { createDb } from "../db/client";
import { tasks } from "../db/schema";
import { and, eq, gte, inArray, isNull, isNotNull } from "drizzle-orm";
import { computeOccurrences, nextOccurrenceAfter } from "@ftm/shared";
import type { RecurrenceConfig } from "@ftm/shared";

// 滾動視界：cron 每日補齊，不需一次物化太遠（也避免 GET /tasks 被實例淹沒）
const HORIZON_DAYS = 90;
// D1 上限 100 bound parameters/query；每行 12 欄 → 每批最多 8 行
const INSERT_CHUNK_SIZE = 8;

export function todayISO(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(now: Date, days: number): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return todayISO(d);
}

/** 算出某模板「應該存在」的所有 dueDate（滾動窗 + 保底至少 1 筆） */
export function targetDatesFor(config: RecurrenceConfig, now: Date): string[] {
  // 窗口起點往前推 1 天：用戶本地日期可能落後 UTC，避免漏掉錨定「今天」的首次發生
  const from = shiftDays(now, -1);
  const to = shiftDays(now, HORIZON_DAYS);
  const occ = computeOccurrences(config, from, to);
  if (occ.length > 0) return occ;
  const next = nextOccurrenceAfter(config, from);
  return next ? [next] : [];
}

type DbClient = ReturnType<typeof createDb>;

/**
 * 刪除模板未來尚未處理的實例（保留已完成歷史；keepInProgress 時連已開工的也保留）。
 * PATCH 重生與 DELETE 系列共用，避免「未來」定義漂移。
 */
export async function pruneFutureInstances(
  db: DbClient,
  templateId: number,
  now: Date,
  opts: { keepInProgress?: boolean } = {},
): Promise<void> {
  const conditions = [
    eq(tasks.parentTaskId, templateId),
    gte(tasks.dueDate, todayISO(now)),
    opts.keepInProgress
      ? eq(tasks.status, "pending")
      : inArray(tasks.status, ["pending", "in_progress", "cancelled"]),
  ];
  await db.delete(tasks).where(and(...conditions));
}

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
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK_SIZE) {
    await db.insert(tasks).values(toInsert.slice(i, i + INSERT_CHUNK_SIZE));
  }
  return toInsert.length;
}

/** 掃描所有 recurring 模板並補齊實例（cron 用）。單一模板失敗不影響其他模板。 */
export async function generateAllRecurringInstances(env: Env, now = new Date()): Promise<void> {
  let templates: (typeof tasks.$inferSelect)[];
  const db = createDb(env.DB);
  try {
    templates = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.taskType, "recurring"), isNull(tasks.parentTaskId)));
  } catch (err) {
    console.error("[recurrence] failed to load templates:", err);
    return;
  }

  console.log(`[recurrence] ${templates.length} templates to expand`);
  let total = 0;
  for (const tpl of templates) {
    try {
      total += await generateInstancesForTemplate(db, tpl, now);
    } catch (err) {
      console.error(`[recurrence] template ${tpl.id} expand error:`, err);
    }
  }
  console.log(`[recurrence] generated ${total} instances`);
}
