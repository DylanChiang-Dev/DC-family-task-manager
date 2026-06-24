import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTaskSchema,
  type CreateTaskInput,
  type RecurrenceConfig,
  type RecurrenceUnit,
  type TaskResponse,
  RECURRENCE_UNIT,
  formatDateKey,
} from "@ftm/shared";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/features/categories/hooks";
import { useTeamMembers } from "@/features/teams/hooks";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateTask, useTasks, useUpdateTask } from "./hooks";

function todayISO(): string {
  return formatDateKey(new Date());
}

const LAST_CAT_KEY = "ftm-last-cat";

function getLastCategoryId(): number | null {
  const v = localStorage.getItem(LAST_CAT_KEY);
  return v ? Number(v) : null;
}

function saveLastCategoryId(id: number | null) {
  if (id) localStorage.setItem(LAST_CAT_KEY, String(id));
  else localStorage.removeItem(LAST_CAT_KEY);
}

type RecurrenceMode = "interval" | "anchored";

function recurrenceMode(config: RecurrenceConfig | null | undefined): RecurrenceMode {
  return config?.mode === "interval" ? "interval" : "anchored";
}

function recurrenceUnit(config: RecurrenceConfig | null | undefined): RecurrenceUnit {
  return config?.unit ?? "week";
}

function defaultForMode(mode: RecurrenceMode, unit: RecurrenceUnit): RecurrenceConfig {
  if (mode === "interval") {
    return { mode: "interval", every: 1, unit, anchorDate: todayISO() };
  }
  switch (unit) {
    case "week":
      return { mode: "anchored", unit: "week", weekdays: [1] };
    case "month":
      return { mode: "anchored", unit: "month", dates: [1] };
    case "year":
      return { mode: "anchored", unit: "year", month: 1, date: 1 };
    case "day":
      return { mode: "interval", every: 1, unit: "day", anchorDate: todayISO() };
  }
}

function serializeAnchored(unit: RecurrenceUnit, value: string): RecurrenceConfig {
  if (unit === "week") {
    const weekdays = value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    return { mode: "anchored", unit: "week", weekdays: weekdays.length ? weekdays : [1] };
  }
  if (unit === "month") {
    const dates = value
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31);
    return { mode: "anchored", unit: "month", dates: dates.length ? dates : [1] };
  }
  const parts = value.split("-").map((s) => Number(s.trim()));
  const month = Number.isInteger(parts[0]) && parts[0]! >= 1 && parts[0]! <= 12 ? parts[0]! : 1;
  const date = Number.isInteger(parts[1]) && parts[1]! >= 1 && parts[1]! <= 31 ? parts[1]! : 1;
  return { mode: "anchored", unit: "year", month, date };
}

function anchoredValue(config: RecurrenceConfig | null | undefined): string {
  if (!config || config.mode !== "anchored") return "1";
  if (config.unit === "week") return config.weekdays.join(",");
  if (config.unit === "month") return config.dates.join(",");
  return `${config.month}-${config.date}`;
}

export function TaskFormDialog({
  open,
  task,
  promote = false,
  defaultProjectId,
  onOpenChange,
}: {
  open: boolean;
  task?: TaskResponse;
  promote?: boolean;
  defaultProjectId?: number;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!task;
  const isInstance = task != null && task.parentTaskId != null;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const { data: categories } = useCategories();
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const user = useAuthStore((s) => s.user);
  const { data: members } = useTeamMembers(currentTeamId ?? Number.NaN);
  const { data: allTasks } = useTasks("all");
  const projects = (allTasks ?? []).filter((t) => t.taskType === "project" && t.id !== task?.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      taskType: task?.taskType ?? "normal",
      recurrenceConfig: task?.recurrenceConfig ?? null,
      dueDate: task?.dueDate ?? todayISO(),
      categoryId: task ? (task.categoryId ?? null) : getLastCategoryId(),
      assigneeId: task?.assigneeId ?? user?.id ?? null,
      startDate: task?.startDate ?? null,
      endDate: task?.endDate ?? null,
      progress: task?.progress ?? 0,
      parentTaskId: task?.parentTaskId ?? null,
      projectId: task?.projectId ?? defaultProjectId ?? null,
      isBacklog: task?.isBacklog ?? false,
    },
  });
  const taskType = watch("taskType");
  const recurrenceConfig = watch("recurrenceConfig");
  const rMode = recurrenceMode(recurrenceConfig);
  const rUnit = recurrenceUnit(recurrenceConfig);

  const onSubmit = async (values: CreateTaskInput) => {
    const input: CreateTaskInput = {
      ...values,
      description: values.description || null,
      dueDate: values.taskType === "project" ? null : values.dueDate || null,
      categoryId: values.categoryId || null,
      assigneeId: values.assigneeId || null,
      recurrenceConfig: values.taskType === "recurring" && !isInstance ? values.recurrenceConfig : null,
      startDate: values.taskType === "window" || values.taskType === "project" ? values.startDate || null : null,
      endDate: values.taskType === "window" || values.taskType === "project" ? values.endDate || null : null,
      projectId: values.taskType === "project" ? null : values.projectId || null,
      isBacklog: promote ? false : values.isBacklog,
    };

    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({ id: task.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "儲存失敗");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{promote ? "升級成任務" : isEdit ? "編輯任務" : "新增任務"}</DialogTitle>
          <DialogDescription>填寫任務內容、優先級與截止日期。</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* 標題 */}
          <div className="space-y-1.5">
            <Label htmlFor="title">標題</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <Label htmlFor="description">描述</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          {/* 優先級 + 截止日期 */}
          <div className={`grid gap-3 ${taskType !== "project" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="space-y-1.5">
              <Label>優先級</Label>
              <Select
                defaultValue={watch("priority")}
                onValueChange={(v) => setValue("priority", v as CreateTaskInput["priority"])}
              >
                <SelectTrigger aria-label="優先級">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskType !== "project" && (
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">截止日期</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...register("dueDate", { setValueAs: (v) => v || null })}
                />
              </div>
            )}
          </div>

          {/* 分類 + 指派對象 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>分類</Label>
              <Select
                defaultValue={watch("categoryId") ? String(watch("categoryId")) : "none"}
                onValueChange={(v) => {
                  const id = v === "none" ? null : Number(v);
                  setValue("categoryId", id);
                  if (!isEdit) saveLastCategoryId(id);
                }}
              >
                <SelectTrigger aria-label="分類">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不分類</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>指派對象</Label>
              <Select
                defaultValue={watch("assigneeId") ? String(watch("assigneeId")) : "none"}
                onValueChange={(v) => setValue("assigneeId", v === "none" ? null : Number(v))}
              >
                <SelectTrigger aria-label="指派對象">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未指派</SelectItem>
                  {(members ?? []).map((member) => (
                    <SelectItem key={member.userId} value={String(member.userId)}>
                      {member.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 任務類型 + (重複模式 | 所屬項目) */}
          {!isInstance && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>任務類型</Label>
                <Select
                  value={taskType}
                  onValueChange={(v) => {
                    const nextType = v as CreateTaskInput["taskType"];
                    setValue("taskType", nextType);
                    setValue(
                      "recurrenceConfig",
                      nextType === "recurring" ? defaultForMode("anchored", "week") : null,
                    );
                    if (nextType === "window" || nextType === "project") {
                      const t = todayISO();
                      if (!watch("startDate")) setValue("startDate", t);
                      if (!watch("endDate")) setValue("endDate", t);
                    }
                  }}
                >
                  <SelectTrigger aria-label="任務類型">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">一般</SelectItem>
                    <SelectItem value="recurring">週期</SelectItem>
                    <SelectItem value="window">時間段</SelectItem>
                    <SelectItem value="project">項目</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 第二欄：週期模式 or 所屬項目 */}
              {taskType === "recurring" ? (
                <div className="space-y-1.5">
                  <Label>重複模式</Label>
                  <Select
                    value={rMode}
                    onValueChange={(v) =>
                      setValue("recurrenceConfig", defaultForMode(v as RecurrenceMode, rUnit === "day" ? "week" : rUnit))
                    }
                  >
                    <SelectTrigger aria-label="重複模式">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interval">固定間隔</SelectItem>
                      <SelectItem value="anchored">對齊特定日</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : taskType !== "project" && projects.length > 0 ? (
                <div className="space-y-1.5">
                  <Label>所屬項目</Label>
                  <Select
                    value={watch("projectId") ? String(watch("projectId")) : "none"}
                    onValueChange={(v) => setValue("projectId", v === "none" ? null : Number(v))}
                  >
                    <SelectTrigger aria-label="所屬項目">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">無</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          )}

          {/* 週期：固定間隔設定 */}
          {taskType === "recurring" && !isInstance && rMode === "interval" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="intervalEvery">間隔數</Label>
                <Input
                  id="intervalEvery"
                  type="number"
                  min={1}
                  value={recurrenceConfig?.mode === "interval" ? recurrenceConfig.every : 1}
                  onChange={(e) =>
                    setValue("recurrenceConfig", {
                      mode: "interval",
                      every: Math.max(1, Number(e.target.value) || 1),
                      unit: rUnit,
                      anchorDate: recurrenceConfig?.mode === "interval" ? recurrenceConfig.anchorDate : todayISO(),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>間隔單位</Label>
                <Select
                  value={rUnit}
                  onValueChange={(v) =>
                    setValue("recurrenceConfig", {
                      mode: "interval",
                      every: recurrenceConfig?.mode === "interval" ? recurrenceConfig.every : 1,
                      unit: v as RecurrenceUnit,
                      anchorDate: recurrenceConfig?.mode === "interval" ? recurrenceConfig.anchorDate : todayISO(),
                    })
                  }
                >
                  <SelectTrigger aria-label="間隔單位">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">天</SelectItem>
                    <SelectItem value="week">週</SelectItem>
                    <SelectItem value="month">月</SelectItem>
                    <SelectItem value="year">年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 週期：對齊特定日設定 */}
          {taskType === "recurring" && !isInstance && rMode === "anchored" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>對齊單位</Label>
                <Select
                  value={rUnit === "day" ? "week" : rUnit}
                  onValueChange={(v) => setValue("recurrenceConfig", defaultForMode("anchored", v as RecurrenceUnit))}
                >
                  <SelectTrigger aria-label="對齊單位">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">每週</SelectItem>
                    <SelectItem value="month">每月</SelectItem>
                    <SelectItem value="year">每年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="anchoredValue">
                  {rUnit === "week"
                    ? "星期（0=日，逗號分隔）"
                    : rUnit === "month"
                      ? "日期（1-31，逗號分隔）"
                      : "月份-日期"}
                </Label>
                <Input
                  id="anchoredValue"
                  value={anchoredValue(recurrenceConfig)}
                  onChange={(e) =>
                    setValue("recurrenceConfig", serializeAnchored(rUnit === "day" ? "week" : rUnit, e.target.value))
                  }
                />
              </div>
            </div>
          )}

          {/* 時間段 / 項目：起止日期 */}
          {(taskType === "window" || taskType === "project") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">開始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate", { setValueAs: (v) => v || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">結束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate", { setValueAs: (v) => v || null })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
