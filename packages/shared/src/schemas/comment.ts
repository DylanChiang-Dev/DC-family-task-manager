import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "留言不能為空").max(2000, "留言最多 2000 個字符"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
