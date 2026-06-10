import type { RecurrenceConfig } from "../schemas/recurrence";

// ── 內部日期工具（全部以「日曆日」為單位，用 UTC 避免 DST）──

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

function parseISO(iso: string): Ymd {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toISO({ y, m, d }: Ymd): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 某年某月（1-12）的最後一天 */
function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function clampDay(y: number, m: number, d: number): number {
  return Math.min(d, lastDayOfMonth(y, m));
}

/** ISO 字串轉 UTC 毫秒（僅用於比較大小） */
function isoToMs(iso: string): number {
  const { y, m, d } = parseISO(iso);
  return Date.UTC(y, m - 1, d);
}

/** 從 Ymd 起算，加 n 天（day/week 用） */
function addDays({ y, m, d }: Ymd, n: number): Ymd {
  const ms = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** interval 模式：把 anchor 往前推 step 次（含 0 次=anchor 本身） */
function intervalAt(anchor: Ymd, every: number, unit: string, step: number): Ymd {
  const k = every * step;
  switch (unit) {
    case "day":
      return addDays(anchor, k);
    case "week":
      return addDays(anchor, k * 7);
    case "month": {
      const totalMonths = anchor.m - 1 + k;
      const y = anchor.y + Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      return { y, m, d: clampDay(y, m, anchor.d) };
    }
    case "year": {
      const y = anchor.y + k;
      return { y, m: anchor.m, d: clampDay(y, anchor.m, anchor.d) };
    }
    default:
      return anchor;
  }
}

const MAX_STEPS = 100000; // runaway 防護

/**
 * 回傳 [fromISO, toISO]（含端點）內所有發生日期，升序、去重。
 */
export function computeOccurrences(
  config: RecurrenceConfig,
  fromISO: string,
  toISO_: string,
): string[] {
  const fromMs = isoToMs(fromISO);
  const toMs = isoToMs(toISO_);
  if (fromMs > toMs) return [];

  if (config.mode === "interval") {
    const anchor = parseISO(config.anchorDate);
    const out: string[] = [];
    for (let step = 0; step < MAX_STEPS; step++) {
      const at = intervalAt(anchor, config.every, config.unit, step);
      const atMs = Date.UTC(at.y, at.m - 1, at.d);
      if (atMs > toMs) break;
      if (atMs >= fromMs) out.push(toISO(at));
    }
    return out;
  }

  // anchored
  const set = new Set<string>();
  const from = parseISO(fromISO);
  const to = parseISO(toISO_);

  if (config.unit === "week") {
    let cursor: Ymd = from;
    while (Date.UTC(cursor.y, cursor.m - 1, cursor.d) <= toMs) {
      const dow = new Date(Date.UTC(cursor.y, cursor.m - 1, cursor.d)).getUTCDay();
      if (config.weekdays.includes(dow)) set.add(toISO(cursor));
      cursor = addDays(cursor, 1);
    }
  } else if (config.unit === "month") {
    for (let y = from.y; y <= to.y; y++) {
      const mStart = y === from.y ? from.m : 1;
      const mEnd = y === to.y ? to.m : 12;
      for (let m = mStart; m <= mEnd; m++) {
        for (const rawD of config.dates) {
          const d = clampDay(y, m, rawD);
          const ms = Date.UTC(y, m - 1, d);
          if (ms >= fromMs && ms <= toMs) set.add(toISO({ y, m, d }));
        }
      }
    }
  } else {
    // year
    for (let y = from.y; y <= to.y; y++) {
      const d = clampDay(y, config.month, config.date);
      const ms = Date.UTC(y, config.month - 1, d);
      if (ms >= fromMs && ms <= toMs) set.add(toISO({ y, m: config.month, d }));
    }
  }

  return [...set].sort();
}

/**
 * 回傳第一個 >= fromISO 的發生日期；找不到（理論上不會）回傳 null。
 * interval 直接從 anchor 往前步進；anchored 用 400 天窗（足以涵蓋 year）找最早一筆。
 */
export function nextOccurrenceAfter(
  config: RecurrenceConfig,
  fromISO: string,
): string | null {
  const fromMs = isoToMs(fromISO);

  if (config.mode === "interval") {
    const anchor = parseISO(config.anchorDate);
    for (let step = 0; step < MAX_STEPS; step++) {
      const at = intervalAt(anchor, config.every, config.unit, step);
      const atMs = Date.UTC(at.y, at.m - 1, at.d);
      if (atMs >= fromMs) return toISO(at);
    }
    return null;
  }

  // anchored：往後最多 400 天必有一筆（year 最遠 ~366 天）
  const from = parseISO(fromISO);
  const end = addDays(from, 400);
  const occ = computeOccurrences(config, fromISO, toISO(end));
  return occ[0] ?? null;
}
