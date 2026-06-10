import type { TaskResponse } from "@ftm/shared";

/** 取出可在日曆顯示的時間段任務（非靈感箱、兩端日期齊全） */
export function getWindowTasks(tasks: TaskResponse[]): TaskResponse[] {
  return tasks.filter(
    (t) => t.taskType === "window" && !t.isBacklog && !!t.startDate && !!t.endDate,
  );
}

export type WindowState = "upcoming" | "active" | "overdue" | "done";

/** 三段式狀態判定（todayKey 為 YYYY-MM-DD） */
export function windowState(task: TaskResponse, todayKey: string): WindowState {
  if (task.status === "completed") return "done";
  if (task.status === "cancelled") return "done";
  if (task.startDate && todayKey < task.startDate) return "upcoming";
  if (task.endDate && todayKey > task.endDate) return "overdue";
  return "active";
}

/** 帶狀區間：通用於任何 { id, startDate, endDate } 物件 */
export interface Spannable {
  id: number;
  startDate: string;
  endDate: string;
}

export function getWeekSpans<T extends Spannable>(
  weekCells: { key: string }[],
  items: T[],
): { item: T; colStart: number; colEnd: number }[] {
  const weekStartKey = weekCells[0]!.key;
  const weekEndKey = weekCells[6]!.key;
  return items
    .filter((it) => it.startDate <= weekEndKey && it.endDate >= weekStartKey)
    .map((it) => {
      const rawStart =
        it.startDate <= weekStartKey ? 0 : weekCells.findIndex((c) => c.key === it.startDate);
      const rawEnd =
        it.endDate >= weekEndKey ? 6 : weekCells.findIndex((c) => c.key === it.endDate);
      return {
        item: it,
        colStart: rawStart < 0 ? 0 : rawStart,
        colEnd: rawEnd < 0 ? 6 : rawEnd,
      };
    });
}

/** window 是否與某日期重疊 */
export function windowOverlapsDate(task: TaskResponse, dateKey: string): boolean {
  return !!task.startDate && !!task.endDate && task.startDate <= dateKey && task.endDate >= dateKey;
}
