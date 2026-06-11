import type { TaskResponse } from "@ftm/shared";
import { formatDateKey } from "@ftm/shared";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

const WINDOW_DAYS = 42;

// 固定調色盤，按 project.id % 5 取色（跨會話穩定）
const PALETTE = [
  { track: "bg-amber-100 dark:bg-amber-500/20", fill: "bg-amber-400/70 dark:bg-amber-400/40", border: "border-amber-300 dark:border-amber-500/40", text: "text-amber-950 dark:text-amber-100" },
  { track: "bg-violet-100 dark:bg-violet-500/20", fill: "bg-violet-400/70 dark:bg-violet-400/40", border: "border-violet-300 dark:border-violet-500/40", text: "text-violet-950 dark:text-violet-100" },
  { track: "bg-cyan-100 dark:bg-cyan-500/20", fill: "bg-cyan-400/70 dark:bg-cyan-400/40", border: "border-cyan-300 dark:border-cyan-500/40", text: "text-cyan-950 dark:text-cyan-100" },
  { track: "bg-rose-100 dark:bg-rose-500/20", fill: "bg-rose-400/70 dark:bg-rose-400/40", border: "border-rose-300 dark:border-rose-500/40", text: "text-rose-950 dark:text-rose-100" },
  { track: "bg-emerald-100 dark:bg-emerald-500/20", fill: "bg-emerald-400/70 dark:bg-emerald-400/40", border: "border-emerald-300 dark:border-emerald-500/40", text: "text-emerald-950 dark:text-emerald-100" },
];

/** YYYY-MM-DD 兩鍵之間的天數差（to - from，UTC 解析避免 DST 漂移） */
function dayDiff(fromKey: string, toKey: string): number {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86400000,
  );
}

function mdLabel(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** 起止日期 → 42 天軸上的百分比定位（兩端裁剪 + 超界旗標） */
export function ganttGeometry(windowStartKey: string, startDate: string, endDate: string) {
  const rawStart = dayDiff(windowStartKey, startDate);
  const rawEnd = dayDiff(windowStartKey, endDate);
  const s = Math.max(0, Math.min(WINDOW_DAYS - 1, rawStart));
  const e = Math.max(0, Math.min(WINDOW_DAYS - 1, rawEnd));
  return {
    leftPct: (s / WINDOW_DAYS) * 100,
    widthPct: ((e - s + 1) / WINDOW_DAYS) * 100,
    overLeft: rawStart < 0,
    overRight: rawEnd > WINDOW_DAYS - 1,
  };
}

/** 甘特顯示對象：project 類型、未完結、非靈感箱、日期齊全、與窗口重疊 */
export function selectGanttProjects(tasks: TaskResponse[], windowStartKey: string): TaskResponse[] {
  const windowEnd = dayDiff("1970-01-01", windowStartKey) + WINDOW_DAYS - 1;
  return tasks.filter(
    (t) =>
      t.taskType === "project" &&
      t.status !== "completed" &&
      t.status !== "cancelled" &&
      !t.isBacklog &&
      !!t.startDate &&
      !!t.endDate &&
      dayDiff("1970-01-01", t.startDate) <= windowEnd &&
      t.endDate >= windowStartKey,
  );
}

export function ProjectGanttPanel({
  tasks,
  start,
  todayKey,
}: {
  tasks: TaskResponse[];
  start: Date;
  todayKey: string;
}) {
  const windowStartKey = formatDateKey(start);
  const projects = selectGanttProjects(tasks, windowStartKey);
  if (projects.length === 0) return null;

  const ticks = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    return formatDateKey(d);
  });
  const endKey = (() => {
    const d = new Date(start);
    d.setDate(start.getDate() + WINDOW_DAYS - 1);
    return formatDateKey(d);
  })();
  const todayLeftPct = ((dayDiff(windowStartKey, todayKey) + 0.5) / WINDOW_DAYS) * 100;

  return (
    <Card className="p-3" aria-label="進行中項目甘特">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold">進行中項目</h2>
        <p className="text-[10px] text-muted-foreground">
          {mdLabel(windowStartKey)} – {mdLabel(endKey)}
        </p>
      </div>
      <div className="grid grid-cols-6 border-b pb-1 text-[10px] text-muted-foreground">
        {ticks.map((t, i) => (
          <span key={t} className={i === 5 ? "text-right" : undefined}>
            {mdLabel(t)}
            {i === 5 ? " →" : ""}
          </span>
        ))}
      </div>
      <div className="relative pt-2">
        {todayLeftPct >= 0 && todayLeftPct <= 100 && (
          <div
            data-testid="gantt-today-line"
            aria-hidden
            className="absolute inset-y-0 z-10 w-0.5 bg-red-500"
            style={{ left: `${todayLeftPct}%` }}
          />
        )}
        {projects.map((p) => {
          const geo = ganttGeometry(windowStartKey, p.startDate!, p.endDate!);
          const color = PALETTE[p.id % PALETTE.length]!;
          const progress = p.projectStats?.progress ?? 0;
          const completed = p.projectStats?.completed ?? 0;
          const total = p.projectStats?.total ?? 0;
          const label = `📖 ${p.title} · ${progress}%（${completed}/${total} 任務）`;
          return (
            <div key={p.id} className="relative mb-2 h-7 last:mb-0">
              <Link
                to={`/tasks/${p.id}`}
                title={`${p.title} · ${p.startDate} → ${p.endDate} · ${progress}%`}
                className={`absolute inset-y-0 overflow-hidden border ${color.track} ${color.border} ${
                  geo.overLeft ? "" : "rounded-l-full"
                } ${geo.overRight ? "" : "rounded-r-full"} hover:brightness-95 dark:hover:brightness-125 transition-[filter]`}
                style={{ left: `${geo.leftPct}%`, width: `${geo.widthPct}%` }}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 ${color.fill}`}
                  style={{ width: `${progress}%` }}
                />
                <span className={`relative z-10 block truncate px-2 text-[11px] font-medium leading-7 ${color.text}`}>
                  {geo.overLeft ? "← " : ""}
                  {label}
                  {geo.overRight ? ` → ${mdLabel(p.endDate!)}` : ` · ${mdLabel(p.endDate!)} 止`}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
