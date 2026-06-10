import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTaskSchema,
  type CreateTaskInput,
  type RecurrenceConfig,
  type RecurrenceUnit,
  type TaskResponse,
  RECURRENCE_UNIT,
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
import { useCreateTask, useUpdateTask } from "./hooks";

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

type RecurrenceMode = "interval" | "anchored";

function recurrenceMode(config: RecurrenceConfig | null | undefined): RecurrenceMode {
  return config?.mode === "interval" ? "interval" : "anchored";
}

function recurrenceUnit(config: RecurrenceConfig | null | undefined): RecurrenceUnit {
  if (!config) return "week";
  if (config.mode === "interval") return config.unit;
  return config.unit;
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
  onOpenChange,
}: {
  open: boolean;
  task?: TaskResponse;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!task;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const { data: categories } = useCategories();
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const { data: members } = useTeamMembers(currentTeamId ?? Number.NaN);

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
      dueDate: task?.dueDate ?? null,
      categoryId: task?.categoryId ?? null,
      assigneeId: task?.assigneeId ?? null,
      startDate: task?.startDate ?? null,
      endDate: task?.endDate ?? null,
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
      dueDate: values.dueDate || null,
      categoryId: values.categoryId || null,
      assigneeId: values.assigneeId || null,
      recurrenceConfig: values.taskType === "recurring" ? values.recurrenceConfig : null,
      startDate: values.taskType === "window" ? values.startDate || null : null,
      endDate: values.taskType === "window" ? values.endDate || null : null,
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
          <DialogTitle>{isEdit ? "編輯任務" : "新增任務"}</DialogTitle>
          <DialogDescription>填寫任務內容、優先級與截止日期。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">標題</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">描述</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">截止日期</Label>
              <Input
                id="dueDate"
                type="date"
                {...register("dueDate", { setValueAs: (v) => v || null })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>分類</Label>
            <Select
              defaultValue={watch("categoryId") ? String(watch("categoryId")) : "none"}
              onValueChange={(v) => setValue("categoryId", v === "none" ? null : Number(v))}
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
          <div className="grid gap-3 sm:grid-cols-2">
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
                  if (nextType === "window") {
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
                </SelectContent>
              </Select>
            </div>
            {taskType === "recurring" && (
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
            )}
          </div>

          {taskType === "recurring" && rMode === "interval" && (
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
                      unit: rUnit === "day" || rUnit === "week" || rUnit === "month" || rUnit === "year" ? rUnit : "week",
                      anchorDate: todayISO(),
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
                      anchorDate: todayISO(),
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

          {taskType === "recurring" && rMode === "anchored" && (
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
