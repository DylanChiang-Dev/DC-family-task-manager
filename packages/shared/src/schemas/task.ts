import { z } from "zod";
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from "../constants/enums";
import { recurrenceConfigSchema } from "./recurrence";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "標題不能為空").max(200, "標題最多 200 個字符"),
  description: z.string().trim().max(5000).nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  priority: z.enum(TASK_PRIORITY).default("medium"),
  status: z.enum(TASK_STATUS).default("pending"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必須為 YYYY-MM-DD")
    .nullable()
    .optional(),
  taskType: z.enum(TASK_TYPE).default("normal"),
  recurrenceConfig: recurrenceConfigSchema.nullable().optional(),
  parentTaskId: z.number().int().positive().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  priority: z.enum(TASK_PRIORITY).optional(),
  status: z.enum(TASK_STATUS).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  taskType: z.enum(TASK_TYPE).optional(),
  recurrenceConfig: recurrenceConfigSchema.nullable().optional(),
  parentTaskId: z.number().int().positive().nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
