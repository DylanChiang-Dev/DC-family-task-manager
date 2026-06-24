import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { TaskResponse, TaskStatus } from "@ftm/shared";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { solarToLunar } from "@/lib/lunar";
import { ScheduleBlockDialog } from "@/features/schedule-blocks/ScheduleBlockDialog";
import { useDeleteScheduleBlock, useScheduleBlocks } from "@/features/schedule-blocks/hooks";
import { TaskFormDialog } from "@/features/tasks/TaskFormDialog";
import { useDeleteTask, useTasks, useUpdateTask } from "@/features/tasks/hooks";
import { formatDateKey } from "@ftm/shared";
import {
  type CalendarTask,
  toCalendarTasks,
} from "@/features/calendar/recurrence";
import {
  getWindowTasks,
  getWeekSpans,
  windowState,
  windowOverlapsDate,
} from "@/features/calendar/windows";
import type { ScheduleBlockResponse } from "@ftm/shared";
import { ProjectGanttPanel } from "./ProjectGanttPanel";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待處理",
  in_progress: "進行中",
  completed: "已完成",
  cancelled: "已取消",
};
const PRIORITY_LABEL: Record<TaskResponse["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};
const PRIORITY_WEIGHT: Record<TaskResponse["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const STATUS_WEIGHT: Record<TaskStatus, number> = {
  in_progress: 4,
  pending: 3,
  completed: 2,
  cancelled: 1,
};

function calendarWindow(anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 41);
  return { start, end };
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sortDashboardTasks(a: CalendarTask, b: CalendarTask) {
  const priority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (priority !== 0) return priority;
  const status = STATUS_WEIGHT[b.status] - STATUS_WEIGHT[a.status];
  if (status !== 0) return status;
  return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
}

function isActiveTask(task: CalendarTask) {
  return task.status !== "completed" && task.status !== "cancelled";
}

function compactDateLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function colorWithAlpha(color: string, alpha: string) {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alpha}`;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  return `color-mix(in srgb, ${color} 16%, transparent)`;
}

function calendarTaskStyle(task: CalendarTask): CSSProperties | undefined {
  if (!task.categoryColor) return undefined;
  return {
    backgroundColor: colorWithAlpha(task.categoryColor, "1F"),
    borderColor: colorWithAlpha(task.categoryColor, "80"),
  };
}

function scheduleBlockStyle(block: ScheduleBlockResponse): CSSProperties {
  return {
    backgroundColor: colorWithAlpha(block.color, "1F"),
    borderColor: colorWithAlpha(block.color, "80"),
  };
}

function blockOverlapsDate(block: ScheduleBlockResponse, dateKey: string) {
  return block.startDate <= dateKey && block.endDate >= dateKey;
}

function scheduleLabel(block: ScheduleBlockResponse) {
  return block.location ? `${block.title} · ${block.location}` : block.title;
}

function calendarCountTone(count: number) {
  if (count >= 3)
    return "border-rose-200 bg-rose-500 text-white shadow-rose-200/70 dark:border-rose-400/40 dark:shadow-rose-950/60";
  if (count === 2)
    return "border-amber-200 bg-amber-400 text-amber-950 shadow-amber-200/70 dark:border-amber-300/40 dark:shadow-amber-950/60";
  return "border-sky-200 bg-sky-500 text-white shadow-sky-200/70 dark:border-sky-400/40 dark:shadow-sky-950/60";
}

function calendarStatusDotTone(status: TaskStatus) {
  if (status === "in_progress") return "bg-blue-500";
  if (status === "completed") return "bg-emerald-500";
  if (status === "cancelled") return "bg-muted-foreground/50";
  return "bg-muted-foreground/70";
}

function calendarTaskTitle(task: CalendarTask) {
  return [
    task.title,
    STATUS_LABEL[task.status],
    task.isRecurringInstance ? "週期" : null,
    task.categoryName,
  ]
    .filter(Boolean)
    .join(" · ");
}

function renderCalendarTask(task: CalendarTask) {
  return (
    <div
      key={`${task.id}-${task.dueDate}-${task.isRecurringInstance ? "r" : "n"}`}
      className={`min-w-0 rounded-md border border-border bg-muted/70 px-1.5 py-0.5 text-foreground shadow-sm ${
        task.status === "cancelled" ? "opacity-65" : ""
      }`}
      style={calendarTaskStyle(task)}
      title={calendarTaskTitle(task)}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${calendarStatusDotTone(task.status)}`}
          aria-label={STATUS_LABEL[task.status]}
        />
        <span className="truncate text-xs font-medium leading-tight">{task.title}</span>
        {task.priority === "high" && <span className="shrink-0 rounded bg-background/70 px-1 text-[10px]">高</span>}
        {task.isRecurringInstance && <span className="shrink-0 text-[10px] leading-none opacity-70">↻</span>}
      </div>
    </div>
  );
}


function DashboardTaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: CalendarTask;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-border/80 p-2 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              className="min-w-0 truncate text-left text-sm font-medium underline-offset-4 hover:underline"
              onClick={onEdit}
            >
              {task.title}
            </button>
            <Badge className="px-1.5 py-0 text-[10px]" variant={task.priority === "high" ? "default" : "secondary"}>
              {PRIORITY_LABEL[task.priority]}
            </Badge>
            {task.isRecurringInstance && (
              <Badge className="px-1.5 py-0 text-[10px]" variant="outline">
                週期
              </Badge>
            )}
            {task.categoryName && (
              <Badge className="px-1.5 py-0 text-[10px]" style={{ backgroundColor: task.categoryColor ?? undefined }}>
                {task.categoryName}
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {task.assigneeNickname ? `指派給 ${task.assigneeNickname}` : "未指派"}
            {task.dueDate ? ` · ${task.dueDate}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
            <SelectTrigger className="h-7 w-[86px] text-xs" aria-label="狀態">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button className="h-6 px-2 text-xs" variant="ghost" size="sm" onClick={onEdit}>
              編輯
            </Button>
            <Button className="h-6 px-2 text-xs" variant="ghost" size="sm" onClick={onDelete}>
              刪除
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const [anchorDate, setAnchorDate] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [showMobileMonth, setShowMobileMonth] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskResponse | null>(null);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleBlockResponse | null>(null);
  // 統計與快捷按鈕注入頂欄插槽（AppLayout #app-header-slot），掛載後才拿得到節點
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("app-header-slot"));
  }, []);
  const { data: tasks, isLoading } = useTasks("all");
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const { start, end } = calendarWindow(anchorDate);
  const { data: scheduleBlocks = [] } = useScheduleBlocks(formatDateKey(start), formatDateKey(end));
  const deleteScheduleMutation = useDeleteScheduleBlock();
  const first = startOfMonth(start);
  const calendarTasks = useMemo(
    () => toCalendarTasks(tasks ?? []),
    [tasks],
  );
  const windowTasks = useMemo(
    () => getWindowTasks(tasks ?? []),
    [tasks],
  );
  const monthTasks = useMemo(
    () =>
      calendarTasks
        .filter((task) => {
          if (!task.dueDate) return false;
          const due = new Date(`${task.dueDate}T00:00:00`);
          return due.getFullYear() === first.getFullYear() && due.getMonth() === first.getMonth();
        })
        .sort(sortDashboardTasks),
    [calendarTasks, first],
  );
  const cells = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const key = formatDateKey(date);
        return {
          date,
          key,
          tasks: calendarTasks.filter((task) => task.dueDate === key && task.status !== "completed").sort(sortDashboardTasks),
          isPast: key < todayKey,
        };
      }),
    [calendarTasks, scheduleBlocks, start, todayKey],
  );
  const rollingWeekdays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => WEEKDAYS[(start.getDay() + index) % 7]),
    [start],
  );
  const selectedTasks = useMemo(
    () => calendarTasks.filter((task) => task.dueDate === selectedDate && task.status !== "completed").sort(sortDashboardTasks),
    [calendarTasks, selectedDate],
  );
  const completedTasks = useMemo(
    () => calendarTasks.filter((task) => task.status === "completed"),
    [calendarTasks],
  );
  const selectedCompletedTasks = useMemo(
    () =>
      calendarTasks
        .filter((task) => {
          if (task.status !== "completed" || !task.completedAt) return false;
          return formatDateKey(new Date(task.completedAt)) === selectedDate;
        })
        .sort(sortDashboardTasks),
    [calendarTasks, selectedDate],
  );
  const selectedScheduleBlocks = useMemo(
    () => scheduleBlocks.filter((block) => blockOverlapsDate(block, selectedDate)),
    [scheduleBlocks, selectedDate],
  );
  const selectedWindowTasks = useMemo(
    () => windowTasks.filter((t) => windowOverlapsDate(t, selectedDate)),
    [windowTasks, selectedDate],
  );
  const todayTasks = useMemo(
    () => calendarTasks.filter((task) => task.dueDate === todayKey).sort(sortDashboardTasks),
    [calendarTasks, todayKey],
  );
  const overdueTasks = useMemo(
    () =>
      calendarTasks
        .filter((task) => task.dueDate && task.dueDate < todayKey && isActiveTask(task))
        .sort(sortDashboardTasks),
    [calendarTasks, todayKey],
  );
  const overdueWindows = useMemo(
    () => windowTasks.filter((t) => windowState(t, todayKey) === "overdue"),
    [windowTasks, todayKey],
  );
  const inProgressTasks = useMemo(
    () => calendarTasks.filter((task) => task.status === "in_progress").sort(sortDashboardTasks),
    [calendarTasks],
  );
  const upcomingTasks = useMemo(
    () =>
      monthTasks
        .filter((task) => task.dueDate && task.dueDate > selectedDate && isActiveTask(task))
        .slice(0, 6),
    [monthTasks, selectedDate],
  );
  const mobileDates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - 1 + index);
        const key = formatDateKey(date);
        return {
          key,
          day: date.getDate(),
          weekday: WEEKDAYS[date.getDay()],
          tasks: calendarTasks.filter((task) => task.dueDate === key),
        };
      }),
    [calendarTasks, today],
  );

  const selectedLabel = selectedDate === todayKey ? "今天" : selectedDate;
  const selectedDateObject = new Date(`${selectedDate}T00:00:00`);
  const selectedLunar = solarToLunar(
    selectedDateObject.getFullYear(),
    selectedDateObject.getMonth() + 1,
    selectedDateObject.getDate(),
  );

  const shiftWindow = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(anchorDate.getDate() + delta * 42);
    setAnchorDate(next);
    setSelectedDate(formatDateKey(next));
  };

  const onStatusChange = (task: CalendarTask, status: TaskStatus) => {
    updateMutation.mutate(
      { id: task.id, input: { status } },
      { onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新失敗") },
    );
  };

  const onDelete = (task: CalendarTask) => {
    if (!confirm(`確定刪除任務「${task.title}」？`)) return;
    deleteMutation.mutate(task.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除失敗"),
    });
  };

  const onDeleteSchedule = (block: ScheduleBlockResponse) => {
    if (!confirm(`確定刪除行程「${block.title}」？`)) return;
    deleteScheduleMutation.mutate(block.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除行程失敗"),
    });
  };

  const renderTaskList = (items: CalendarTask[], emptyText: string) => {
    if (isLoading) return <p className="text-sm text-muted-foreground">載入中...</p>;
    if (items.length === 0) return <p className="py-6 text-sm text-muted-foreground">{emptyText}</p>;
    return (
      <div className="space-y-2">
        {items.map((task) => (
          <DashboardTaskCard
            key={`${task.id}-${task.dueDate}-${task.isRecurringInstance ? "r" : "n"}`}
            task={task}
            onStatusChange={(status) => onStatusChange(task, status)}
            onEdit={() => setEditing((tasks ?? []).find((item) => item.id === task.id) ?? task)}
            onDelete={() => onDelete(task)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {headerSlot &&
        createPortal(
          <>
            <div className="hidden items-center gap-1.5 md:flex" aria-label="工作台概覽">
              {[
                ["今天", todayTasks.length],
                ["逾期", overdueTasks.length + overdueWindows.length],
                ["進行中", inProgressTasks.length],
                ["本月", monthTasks.length],
                ["已完成", completedTasks.length],
              ].map(([label, count]) => (
                <span key={label} className="rounded-md border bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
                  {label} <span className="font-semibold text-foreground">{count}</span>
                </span>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreatingSchedule(true)}>
              新增行程
            </Button>
            <Button size="sm" onClick={() => setCreating(true)}>
              新增任務
            </Button>
          </>,
          headerSlot,
        )}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4 lg:order-1">
          <ProjectGanttPanel tasks={tasks ?? []} start={start} todayKey={todayKey} />
          <Card className="hidden p-4 sm:flex sm:flex-col lg:h-[calc(100svh-13rem)] lg:overflow-hidden" aria-label="未來 6 週日曆">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h2 className="text-sm font-semibold">
                {compactDateLabel(formatDateKey(start))} - {compactDateLabel(formatDateKey(end))}
                <span className="ml-2 font-normal text-muted-foreground">未來 6 週</span>
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => shiftWindow(-1)}>
                  前 6 週
                </Button>
                <Button variant="outline" size="sm" onClick={() => shiftWindow(1)}>
                  後 6 週
                </Button>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {rollingWeekdays.map((day, index) => (
                <div key={`${day}-${index}`} className="py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {Array.from({ length: 6 }, (_, weekIndex) => {
                const weekCells = cells.slice(weekIndex * 7, (weekIndex + 1) * 7);
                const weekSpans = getWeekSpans(weekCells, scheduleBlocks);
                const windowSpans = getWeekSpans(
                  weekCells,
                  windowTasks.map((t) => ({ id: t.id, startDate: t.startDate!, endDate: t.endDate! })),
                );
                return (
                  <div key={weekIndex} className="flex flex-1 flex-col min-h-0 overflow-hidden">
                    <div className="grid min-h-0 flex-1 grid-cols-7 gap-1 [grid-auto-rows:minmax(0,1fr)]">
                      {weekCells.map((cell) => (
                        <button
                          key={cell.key}
                          aria-label={cell.key}
                          className={`flex min-h-24 max-h-36 flex-col items-stretch justify-start overflow-hidden rounded-lg border p-2 text-left transition lg:min-h-0 lg:max-h-none ${
                            cell.key === selectedDate ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                          } ${cell.isPast ? "opacity-50" : "opacity-100"}`}
                          onClick={() => setSelectedDate(cell.key)}
                        >
                          <div className="flex shrink-0 items-start justify-between gap-1">
                            <span className="font-medium">{cell.date.getDate()}</span>
                            {cell.tasks.length > 0 && (
                              <span
                                className={`min-w-6 rounded-full border px-1.5 text-center text-[10px] font-semibold shadow-sm ${calendarCountTone(cell.tasks.length)}`}
                              >
                                {cell.tasks.length}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
                            {cell.tasks.map((task) => renderCalendarTask(task))}
                          </div>
                        </button>
                      ))}
                    </div>
                    {weekSpans.map((span) => {
                      const isStart = span.item.startDate >= weekCells[0]!.key;
                      const isEnd = span.item.endDate <= weekCells[6]!.key;
                      return (
                        <div key={span.item.id} className="mt-0.5 grid grid-cols-7 gap-1 h-5">
                          <button
                            type="button"
                            className={`truncate border px-1.5 text-[10px] font-medium leading-5 text-left cursor-pointer hover:brightness-95 dark:hover:brightness-125 transition-[filter] ${isStart ? "rounded-l-md" : "border-l-0"} ${isEnd ? "rounded-r-md" : "border-r-0"}`}
                            style={{
                              gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}`,
                              ...scheduleBlockStyle(span.item),
                            }}
                            title={`${span.item.title} · ${span.item.startDate} - ${span.item.endDate}`}
                            onClick={() => setEditingSchedule(span.item)}
                          >
                            {isStart && scheduleLabel(span.item)}
                          </button>
                        </div>
                      );
                    })}
                    {windowSpans.map((span) => {
                      const t = windowTasks.find((wt) => wt.id === span.item.id)!;
                      const isStart = t.startDate! >= weekCells[0]!.key;
                      const isEnd = t.endDate! <= weekCells[6]!.key;
                      const state = windowState(t, todayKey);
                      const tone =
                        state === "overdue"
                          ? "bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                          : state === "done"
                            ? "bg-muted border-border text-muted-foreground line-through"
                            : state === "upcoming"
                              ? "bg-indigo-50 border-indigo-200 text-indigo-500 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-300"
                              : "bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-200";
                      return (
                        <div key={`w-${t.id}`} className="mt-0.5 grid grid-cols-7 gap-1 h-5">
                          <Link
                            to={`/tasks/${t.id}`}
                            className={`truncate border px-1.5 text-[10px] font-medium leading-5 text-left hover:brightness-95 dark:hover:brightness-125 transition-[filter] ${tone} ${isStart ? "rounded-l-md" : "border-l-0"} ${isEnd ? "rounded-r-md" : "border-r-0"}`}
                            style={{ gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}` }}
                            title={`${t.title} · ${t.startDate} - ${t.endDate} · ${t.progress}%`}
                          >
                            {isStart && `${t.title}（${t.progress}%）`}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-3 sm:hidden" aria-label="行動日期條">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">接下來 14 天</h2>
                <p className="text-sm text-muted-foreground">左右滑動選日期</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowMobileMonth((v) => !v)}>
                {showMobileMonth ? "收起日曆" : "展開 6 週日曆"}
              </Button>
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {mobileDates.map((item) => (
                <button
                  key={item.key}
                  className={`min-w-16 rounded-lg border px-3 py-2 text-center ${
                    item.key === selectedDate ? "border-primary bg-primary/10" : "border-border"
                  }`}
                  onClick={() => setSelectedDate(item.key)}
                >
                  <div className="text-xs text-muted-foreground">{item.weekday}</div>
                  <div className="font-semibold">{item.day}</div>
                  <div className="text-[11px] text-muted-foreground">{item.tasks.length} 件</div>
                </button>
              ))}
            </div>
          </Card>

          {showMobileMonth && (
            <Card className="p-3 sm:hidden" aria-label="手機 6 週日曆">
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {rollingWeekdays.map((day, index) => (
                  <div key={`${day}-${index}`} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {Array.from({ length: 6 }, (_, weekIndex) => {
                  const weekCells = cells.slice(weekIndex * 7, (weekIndex + 1) * 7);
                  const weekSpans = getWeekSpans(weekCells, scheduleBlocks);
                  return (
                    <div key={weekIndex}>
                      <div className="grid grid-cols-7 gap-1">
                        {weekCells.map((cell) => (
                          <button
                            key={cell.key}
                            aria-label={cell.key}
                            className={`min-h-14 rounded-md border p-1 text-left text-xs ${
                              cell.key === selectedDate ? "border-primary bg-primary/10" : "border-border"
                            } ${cell.isPast ? "opacity-50" : "opacity-100"}`}
                            onClick={() => setSelectedDate(cell.key)}
                          >
                            <div className="font-medium">{cell.date.getDate()}</div>
                            {cell.tasks.length > 0 && <div className="text-[10px]">{cell.tasks.length} 件</div>}
                          </button>
                        ))}
                      </div>
                      {weekSpans.map((span) => {
                        const isStart = span.item.startDate >= weekCells[0]!.key;
                        const isEnd = span.item.endDate <= weekCells[6]!.key;
                        return (
                          <div key={span.item.id} className="mt-0.5 grid grid-cols-7 gap-1 h-4">
                            <button
                              type="button"
                              className={`truncate border px-1 text-[9px] font-medium leading-4 text-left cursor-pointer hover:brightness-95 dark:hover:brightness-125 transition-[filter] ${isStart ? "rounded-l" : "border-l-0"} ${isEnd ? "rounded-r" : "border-r-0"}`}
                              style={{
                                gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}`,
                                ...scheduleBlockStyle(span.item),
                              }}
                              title={`${span.item.title} · ${span.item.startDate} - ${span.item.endDate}`}
                              onClick={() => setEditingSchedule(span.item)}
                            >
                              {isStart && scheduleLabel(span.item)}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>

        <aside className="min-w-0 space-y-3 lg:order-2">
          <Card className="space-y-2 border-sky-100 bg-sky-50/70 p-3 dark:border-sky-500/25 dark:bg-sky-500/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{selectedLabel}</h2>
                <p className="text-sm text-muted-foreground">
                  {compactDateLabel(selectedDate)} · {selectedLunar.day}
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                {selectedTasks.length} 件
              </span>
            </div>
            {selectedScheduleBlocks.length > 0 && (
              <div className="space-y-1" aria-label="當日行程">
                {selectedScheduleBlocks.map((block) => (
                  <div key={block.id} className="rounded-md border bg-background/70 p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{block.title}</p>
                        {block.location && (
                          <p className="truncate text-muted-foreground">{block.location}</p>
                        )}
                        <p className="text-muted-foreground">
                          {block.startDate} - {block.endDate}
                        </p>
                        {block.note && <p className="mt-1 text-muted-foreground">{block.note}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => setEditingSchedule(block)}
                        >
                          編輯
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => onDeleteSchedule(block)}
                        >
                          刪除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedWindowTasks.length > 0 && (
              <div className="space-y-1" aria-label="當日時間段任務">
                {selectedWindowTasks.map((t) => (
                  <Link
                    key={t.id}
                    to={`/tasks/${t.id}`}
                    className="block rounded-md border border-indigo-200 bg-indigo-50/70 p-2 text-xs hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20"
                  >
                    <p className="truncate font-medium">{t.title}（{t.progress}%）</p>
                    <p className="text-muted-foreground">{t.startDate} - {t.endDate}</p>
                  </Link>
                ))}
              </div>
            )}
            {renderTaskList(selectedTasks, "這天沒有任務")}
          </Card>

          {(overdueTasks.length > 0 || overdueWindows.length > 0) && (
            <Card
              className="space-y-2 border-rose-100 bg-rose-50/70 p-3 dark:border-rose-500/25 dark:bg-rose-500/10"
              aria-label="逾期未完成任務"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">逾期未完成</h2>
                  <p className="text-sm text-muted-foreground">先處理這些最有影響</p>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  {overdueTasks.length + overdueWindows.length} 件
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto overscroll-contain space-y-2">
                {renderTaskList(overdueTasks, "沒有逾期任務")}
                {overdueWindows.length > 0 && (
                  <div className="space-y-1">
                    {overdueWindows.map((t) => (
                      <Link
                        key={t.id}
                        to={`/tasks/${t.id}`}
                        className="block rounded-md border border-rose-200 bg-white/60 p-2 text-xs hover:bg-white dark:border-rose-500/30 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <p className="truncate font-medium">{t.title}（{t.progress}%）</p>
                        <p className="text-muted-foreground">截止 {t.endDate}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="space-y-2 border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">本月接下來</h2>
                <p className="text-sm text-muted-foreground">
                  {first.getMonth() + 1} 月剩餘安排
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {upcomingTasks.length} 件
              </span>
            </div>
            {renderTaskList(upcomingTasks, "本月接下來沒有任務")}
          </Card>
          {selectedCompletedTasks.length > 0 && (
            <Card className="space-y-2 border-border bg-muted/20 p-3 dark:bg-muted/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">已完成</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {selectedCompletedTasks.length} 件
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto overscroll-contain">
                {renderTaskList(selectedCompletedTasks, "")}
              </div>
            </Card>
          )}
        </aside>
      </div>

      {creating && <TaskFormDialog open onOpenChange={(o) => !o && setCreating(false)} />}
      {creatingSchedule && (
        <ScheduleBlockDialog
          open
          defaultDate={selectedDate}
          onOpenChange={(o) => !o && setCreatingSchedule(false)}
        />
      )}
      {editing && (
        <TaskFormDialog
          open
          task={editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      )}
      {editingSchedule && (
        <ScheduleBlockDialog
          open
          block={editingSchedule}
          defaultDate={selectedDate}
          onOpenChange={(o) => {
            if (!o) setEditingSchedule(null);
          }}
          onDelete={() => onDeleteSchedule(editingSchedule)}
        />
      )}
    </div>
  );
}
