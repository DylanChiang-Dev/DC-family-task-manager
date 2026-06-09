import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD");
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "顏色必須是 #RRGGBB");

export const createScheduleBlockSchema = z
  .object({
    title: z.string().trim().min(1, "標題不能為空").max(120, "標題最多 120 個字符"),
    location: z.string().trim().max(120).nullable().optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    color: colorSchema.default("#0EA5E9"),
    note: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "結束日期不能早於開始日期",
        path: ["endDate"],
      });
    }
  });

export type CreateScheduleBlockInput = z.infer<typeof createScheduleBlockSchema>;

export const updateScheduleBlockSchema = createScheduleBlockSchema.partial().superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "結束日期不能早於開始日期",
      path: ["endDate"],
    });
  }
});

export type UpdateScheduleBlockInput = z.infer<typeof updateScheduleBlockSchema>;

export interface ScheduleBlockResponse {
  id: number;
  userId: number;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string;
  color: string;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}
