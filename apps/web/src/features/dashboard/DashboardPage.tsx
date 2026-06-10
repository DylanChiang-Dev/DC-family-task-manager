import { useMemo, useState, type CSSProperties } from "react";
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
import {
  type CalendarTask,
  toCalendarTasks,
  formatDateKey,
} from "@/features/calendar/recurrence";
import type { ScheduleBlockResponse } from "@ftm/shared";

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
  return `color-mix(in srgb, ${color} 16%, white)`;
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

function getWeekBlockSpans(
  weekCells: { key: string }[],
  allBlocks: ScheduleBlockResponse[],
): { block: ScheduleBlockResponse; colStart: number; colEnd: number }[] {
  const weekStartKey = weekCells[0]!.key;
  const weekEndKey = weekCells[6]!.key;
  return allBlocks
    .filter((b) => b.startDate <= weekEndKey && b.endDate >= weekStartKey)
    .map((b) => {
      const colStart = b.startDate <= weekStartKey ? 0 : weekCells.findIndex((c) => c.key === b.startDate);
      const colEnd = b.endDate >= weekEndKey ? 6 : weekCells.findIndex((c) => c.key === b.endDate);
      return { block: b, colStart: colStart < 0 ? 0 : colStart, colEnd: colEnd < 0 ? 6 : colEnd };
    });
}

function scheduleLabel(block: ScheduleBlockResponse) {
  return block.location || block.title;
}

function calendarCountTone(count: number) {
  if (count >= 3) return "border-rose-200 bg-rose-500 text-white shadow-rose-200/70";
  if (count === 2) return "border-amber-200 bg-amber-400 text-amber-950 shadow-amber-200/70";
  return "border-sky-200 bg-sky-500 text-white shadow-sky-200/70";
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
            <Link className="min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline" to={`/tasks/${task.id}`}>
              {task.title}
            </Link>
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
  const [anchorDate, setAnchorDate] = useState(() => new Date(today));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [showMobileMonth, setShowMobileMonth] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaskResponse | null>(null);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleBlockResponse | null>(null);
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
          tasks: calendarTasks.filter((task) => task.dueDate === key).sort(sortDashboardTasks),
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
    () => calendarTasks.filter((task) => task.dueDate === selectedDate).sort(sortDashboardTasks),
    [calendarTasks, selectedDate],
  );
  const selectedScheduleBlocks = useMemo(
    () => scheduleBlocks.filter((block) => blockOverlapsDate(block, selectedDate)),
    [scheduleBlocks, selectedDate],
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
        date.setDate(today.getDate() + index);
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
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">家庭工作台</p>
          <h1 className="text-2xl font-semibold tracking-normal">今天要做什麼，一眼看清</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
          <div className="grid grid-cols-4 gap-2 text-right" aria-label="工作台概覽">
            {[
              ["今天", todayTasks.length],
              ["逾期", overdueTasks.length],
              ["進行中", inProgressTasks.length],
              ["本月", monthTasks.length],
            ].map(([label, count]) => (
              <div key={label} className="rounded-md border bg-background/70 px-2.5 py-1.5">
                <p className="text-[11px] leading-none text-muted-foreground">{label}</p>
                <p className="mt-1 text-base font-semibold leading-none">{count}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="sm:w-auto" onClick={() => setCreatingSchedule(true)}>
              新增行程
            </Button>
            <Button className="sm:w-auto" onClick={() => setCreating(true)}>
              新增任務
            </Button>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4 lg:order-1">
          <Card className="hidden p-4 sm:flex sm:flex-col lg:min-h-[calc(100svh-13rem)]" aria-label="未來 6 週日曆">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {compactDateLabel(formatDateKey(start))} - {compactDateLabel(formatDateKey(end))}
                </h2>
                <p className="text-sm text-muted-foreground">從今天開始，向後查看 6 週安排</p>
              </div>
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
                const weekSpans = getWeekBlockSpans(weekCells, scheduleBlocks);
                return (
                  <div key={weekIndex} className="flex flex-1 flex-col min-h-0">
                    <div className="grid min-h-0 flex-1 grid-cols-7 gap-1">
                      {weekCells.map((cell) => (
                        <button
                          key={cell.key}
                          aria-label={cell.key}
                          className={`flex min-h-24 flex-col items-stretch justify-start rounded-lg border p-2 text-left transition lg:min-h-0 ${
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
                          <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-hidden">
                            {cell.tasks.slice(0, 5).map((task) => renderCalendarTask(task))}
                            {cell.tasks.length > 5 && (
                              <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                +{cell.tasks.length - 5} 個任務
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {weekSpans.map((span) => {
                      const isStart = span.block.startDate >= weekCells[0]!.key;
                      const isEnd = span.block.endDate <= weekCells[6]!.key;
                      return (
                        <div key={span.block.id} className="mt-0.5 grid grid-cols-7 gap-1 h-5">
                          <button
                            type="button"
                            className={`truncate border px-1.5 text-[10px] font-medium leading-5 text-left cursor-pointer hover:brightness-95 transition-[filter] ${isStart ? "rounded-l-md" : "border-l-0"} ${isEnd ? "rounded-r-md" : "border-r-0"}`}
                            style={{
                              gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}`,
                              ...scheduleBlockStyle(span.block),
                            }}
                            title={`${span.block.title} · ${span.block.startDate} - ${span.block.endDate}`}
                            onClick={() => setEditingSchedule(span.block)}
                          >
                            {isStart && scheduleLabel(span.block)}
                          </button>
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
                  const weekSpans = getWeekBlockSpans(weekCells, scheduleBlocks);
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
                        const isStart = span.block.startDate >= weekCells[0]!.key;
                        const isEnd = span.block.endDate <= weekCells[6]!.key;
                        return (
                          <div key={span.block.id} className="mt-0.5 grid grid-cols-7 gap-1 h-4">
                            <button
                              type="button"
                              className={`truncate border px-1 text-[9px] font-medium leading-4 text-left cursor-pointer hover:brightness-95 transition-[filter] ${isStart ? "rounded-l" : "border-l-0"} ${isEnd ? "rounded-r" : "border-r-0"}`}
                              style={{
                                gridColumn: `${span.colStart + 1} / ${span.colEnd + 2}`,
                                ...scheduleBlockStyle(span.block),
                              }}
                              title={`${span.block.title} · ${span.block.startDate} - ${span.block.endDate}`}
                              onClick={() => setEditingSchedule(span.block)}
                            >
                              {isStart && scheduleLabel(span.block)}
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
          <Card className="space-y-2 border-sky-100 bg-sky-50/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{selectedLabel}</h2>
                <p className="text-sm text-muted-foreground">
                  {compactDateLabel(selectedDate)} · {selectedLunar.day}
                </p>
              </div>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">
                {selectedTasks.length} 件
              </span>
            </div>
            {selectedScheduleBlocks.length > 0 && (
              <div className="space-y-1" aria-label="當日行程">
                {selectedScheduleBlocks.map((block) => (
                  <div key={block.id} className="rounded-md border bg-background/70 p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{scheduleLabel(block)}</p>
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
            {renderTaskList(selectedTasks, "這天沒有任務")}
          </Card>

          {overdueTasks.length > 0 && (
            <Card className="space-y-2 border-rose-100 bg-rose-50/70 p-3" aria-label="逾期未完成任務">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">逾期未完成</h2>
                  <p className="text-sm text-muted-foreground">先處理這些最有影響</p>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700">
                  {overdueTasks.length} 件
                </span>
              </div>
              {renderTaskList(overdueTasks.slice(0, 4), "沒有逾期任務")}
            </Card>
          )}

          <Card className="space-y-2 border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">本月接下來</h2>
                <p className="text-sm text-muted-foreground">
                  {first.getMonth() + 1} 月剩餘安排
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                {upcomingTasks.length} 件
              </span>
            </div>
            {renderTaskList(upcomingTasks, "本月接下來沒有任務")}
          </Card>
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
