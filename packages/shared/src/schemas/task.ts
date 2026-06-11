import { z } from "zod";
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE } from "../constants/enums";
import { recurrenceConfigSchema } from "./recurrence";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// 共用欄位（create 與 update 各自決定 optional 程度）
const taskFields = {
  description: z.string().trim().max(5000).nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  priority: z.enum(TASK_PRIORITY),
  status: z.enum(TASK_STATUS),
  dueDate: z.string().regex(ISO_DATE, "日期格式必須為 YYYY-MM-DD").nullable().optional(),
  taskType: z.enum(TASK_TYPE),
  recurrenceConfig: recurrenceConfigSchema.nullable().optional(),
  parentTaskId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  startDate: z.string().regex(ISO_DATE).nullable().optional(),
  endDate: z.string().regex(ISO_DATE).nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  isBacklog: z.boolean().optional(),
};

/**
 * 跨欄位一致性校驗。create 與 update 共用；update 時欄位多半 optional，
 * 故所有檢查都以「該欄位有給值」為前提，未給則略過。
 */
function refineTask(
  data: {
    taskType?: (typeof TASK_TYPE)[number];
    recurrenceConfig?: unknown;
    startDate?: string | null;
    endDate?: string | null;
    progress?: number;
    isBacklog?: boolean;
    parentTaskId?: number | null;
    projectId?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const isBacklog = data.isBacklog === true;
  const type = data.taskType;
  const isTemplate = type === "recurring" && data.parentTaskId == null;

  // 項目結構約束不因靈感箱而豁免，置於 isBacklog 早退之前
  if (type === "project") {
    if (data.projectId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "項目不可掛在其他項目下",
        path: ["projectId"],
      });
    }
    if (data.parentTaskId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "項目不能成為其他任務的子任務",
        path: ["parentTaskId"],
      });
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "開始日期不能晚於結束日期",
        path: ["endDate"],
      });
    }
  }

  // progress 僅 window 可非 0；update 未帶 taskType 時交由路由按既有任務類型檢查
  if (data.progress != null && data.progress !== 0 && type !== undefined && type !== "window") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "只有時間段任務可設定進度",
      path: ["progress"],
    });
  }

  if (isBacklog) return; // 靈感箱跳過所有時間/配置要求

  if (type === "recurring") {
    // 模板需要 recurrenceConfig；實例（parentTaskId 非空）不檢查
    if (isTemplate && !data.recurrenceConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "週期任務必須提供週期配置 (recurrenceConfig)",
        path: ["recurrenceConfig"],
      });
    }
  } else if (data.recurrenceConfig) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "只有週期任務才能提供週期配置 (recurrenceConfig)",
      path: ["recurrenceConfig"],
    });
  }

  if (type === "window") {
    if (data.recurrenceConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "時間段任務不可設定週期配置",
        path: ["recurrenceConfig"],
      });
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "開始日期不能晚於結束日期",
        path: ["endDate"],
      });
    }
  }
}

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, "標題不能為空").max(200, "標題最多 200 個字符"),
    ...taskFields,
    priority: z.enum(TASK_PRIORITY).default("medium"),
    status: z.enum(TASK_STATUS).default("pending"),
    taskType: z.enum(TASK_TYPE).default("normal"),
    progress: z.number().int().min(0).max(100).default(0),
    isBacklog: z.boolean().default(false),
  })
  .superRefine(refineTask);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    ...taskFields,
    priority: z.enum(TASK_PRIORITY).optional(),
    status: z.enum(TASK_STATUS).optional(),
    taskType: z.enum(TASK_TYPE).optional(),
  })
  .superRefine(refineTask);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
