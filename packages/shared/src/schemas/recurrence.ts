import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 每 N 個單位重複，從 anchorDate 起算 */
const intervalSchema = z.object({
  mode: z.literal("interval"),
  every: z.number().int().min(1).max(999),
  unit: z.enum(["day", "week", "month", "year"]),
  anchorDate: z.string().regex(ISO_DATE, "日期格式必須為 YYYY-MM-DD"),
});

/** 對齊特定週幾 */
const anchoredWeekSchema = z.object({
  mode: z.literal("anchored"),
  unit: z.literal("week"),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1), // 0=日
});

/** 對齊每月特定幾號 */
const anchoredMonthSchema = z.object({
  mode: z.literal("anchored"),
  unit: z.literal("month"),
  dates: z.array(z.number().int().min(1).max(31)).min(1),
});

/** 對齊每年特定月日 */
const anchoredYearSchema = z.object({
  mode: z.literal("anchored"),
  unit: z.literal("year"),
  month: z.number().int().min(1).max(12),
  date: z.number().int().min(1).max(31),
});

// 注意：3 個 anchored 變體共用 mode="anchored"，無法用 discriminatedUnion("mode")，
// 故用 z.union。
export const recurrenceConfigSchema = z.union([
  intervalSchema,
  anchoredWeekSchema,
  anchoredMonthSchema,
  anchoredYearSchema,
]);

export type RecurrenceConfig = z.infer<typeof recurrenceConfigSchema>;
