import type { TaskResponse } from "@ftm/shared";

export interface CalendarTask extends TaskResponse {
  isRecurringInstance?: boolean;
}

export function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 把後端任務列表轉成日曆任務：
 * - 濾掉週期「模板」（recurring 且 parentTaskId 為空，本身無 dueDate）
 * - 濾掉沒有 dueDate 的任務（不落在日曆格）
 * - 週期實例（parentTaskId 非空）標記 isRecurringInstance 供樣式區分
 * window 類型的帶狀渲染由 Plan 2 另外處理，這裡只處理「落在某天的點」。
 */
export function toCalendarTasks(tasks: TaskResponse[]): CalendarTask[] {
  return tasks
    .filter((t) => !(t.taskType === "recurring" && t.parentTaskId == null))
    .filter((t) => !!t.dueDate)
    .map((t) => ({
      ...t,
      isRecurringInstance: t.taskType === "recurring" && t.parentTaskId != null,
    }));
}
