import type { RecurrenceConfig, TaskResponse } from "@ftm/shared";

export interface CalendarTask extends TaskResponse {
  isRecurringInstance?: boolean;
}

export function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shouldShowRecurringTask(date: Date, config: RecurrenceConfig) {
  switch (config.frequency) {
    case "daily":
      return true;
    case "weekly":
      return config.days.includes(date.getDay());
    case "monthly":
      return config.dates.includes(date.getDate());
    case "yearly":
      return date.getMonth() + 1 === config.month && date.getDate() === config.date;
  }
}

export function expandRecurringTasks(tasks: TaskResponse[], startDate: Date, endDate: Date) {
  const result: CalendarTask[] = [];

  for (const task of tasks) {
    if (task.taskType !== "recurring" || !task.recurrenceConfig) {
      if (task.dueDate) result.push(task);
      continue;
    }

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      if (shouldShowRecurringTask(cursor, task.recurrenceConfig)) {
        result.push({
          ...task,
          dueDate: formatDateKey(cursor),
          isRecurringInstance: true,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return result;
}
