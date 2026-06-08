import type { RecurrenceConfig } from "../schemas/recurrence";

/**
 * 判斷一個週期任務在指定日期是否應該出現。
 *
 * 規則：
 * - daily: 永遠 true
 * - weekly: 該日期的星期幾（0=Sun, 6=Sat）是否在 config.days 中
 * - monthly: 該日期的日（1-31）是否在 config.dates 中
 * - yearly: 該日期的月份和日是否匹配 config.month 和 config.date
 *
 * @param config 週期配置（來自 recurrenceConfigSchema）
 * @param dateStr YYYY-MM-DD 格式的日期字串
 * @returns true 表示該任務在指定日期應該顯示
 */
export function shouldShowRecurringTask(
  config: RecurrenceConfig | null | undefined,
  dateStr: string,
): boolean {
  if (!config) return false;

  const [y, m, d] = dateStr.split("-").map(Number);
  if (y == null || m == null || d == null) return false;

  const date = new Date(y, m - 1, d);

  switch (config.frequency) {
    case "daily":
      return true;
    case "weekly": {
      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
      return config.days.includes(dayOfWeek);
    }
    case "monthly":
      return config.dates.includes(d);
    case "yearly":
      return config.month === m && config.date === d;
  }
}
