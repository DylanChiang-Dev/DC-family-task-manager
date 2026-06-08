import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "分類名不能為空").max(30, "分類名最多 30 個字符"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "顏色格式必須為 HEX (例: #3B82F6)")
    .default("#3B82F6"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(30).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
