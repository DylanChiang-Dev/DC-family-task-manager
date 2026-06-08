import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTaskSchema,
  type CreateTaskInput,
  type RecurrenceConfig,
  type TaskResponse,
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

type Frequency = RecurrenceConfig["frequency"];

function defaultRecurrenceConfig(frequency: Frequency): RecurrenceConfig {
  switch (frequency) {
    case "daily":
      return { frequency: "daily" };
    case "weekly":
      return { frequency: "weekly", days: [1] };
    case "monthly":
      return { frequency: "monthly", dates: [1] };
    case "yearly":
      return { frequency: "yearly", month: 1, date: 1 };
  }
}

function serializeRecurrenceConfig(frequency: Frequency, value: string): RecurrenceConfig {
  if (frequency === "weekly") {
    const days = value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
    return { frequency, days: days.length > 0 ? days : [1] };
  }

  if (frequency === "monthly") {
    const dates = value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31);
    return { frequency, dates: dates.length > 0 ? dates : [1] };
  }

  if (frequency === "yearly") {
    const parts = value.split("-").map((item) => Number(item.trim()));
    const monthValue = parts[0] ?? 1;
    const dateValue = parts[1] ?? 1;
    return {
      frequency,
      month: Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12 ? monthValue : 1,
      date: Number.isInteger(dateValue) && dateValue >= 1 && dateValue <= 31 ? dateValue : 1,
    };
  }

  return { frequency };
}

function recurrenceValue(config: RecurrenceConfig | null | undefined) {
  if (!config) return "1";
  switch (config.frequency) {
    case "daily":
      return "1";
    case "weekly":
      return config.days.join(",");
    case "monthly":
      return config.dates.join(",");
    case "yearly":
      return `${config.month}-${config.date}`;
  }
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
    },
  });
  const taskType = watch("taskType");
  const recurrenceConfig = watch("recurrenceConfig");
  const recurrenceFrequency = recurrenceConfig?.frequency ?? "daily";

  const onSubmit = async (values: CreateTaskInput) => {
    const input: CreateTaskInput = {
      ...values,
      description: values.description || null,
      dueDate: values.dueDate || null,
      categoryId: values.categoryId || null,
      assigneeId: values.assigneeId || null,
      recurrenceConfig: values.taskType === "recurring" ? values.recurrenceConfig : null,
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
                    nextType === "recurring" ? defaultRecurrenceConfig("daily") : null,
                  );
                }}
              >
                <SelectTrigger aria-label="任務類型">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">一般</SelectItem>
                  <SelectItem value="recurring">週期</SelectItem>
                  <SelectItem value="repeatable">可重複</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {taskType === "recurring" && (
              <div className="space-y-1.5">
                <Label>週期頻率</Label>
                <Select
                  value={recurrenceFrequency}
                  onValueChange={(v) =>
                    setValue("recurrenceConfig", defaultRecurrenceConfig(v as Frequency))
                  }
                >
                  <SelectTrigger aria-label="週期頻率">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日</SelectItem>
                    <SelectItem value="weekly">每週</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="yearly">每年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {taskType === "recurring" && recurrenceFrequency !== "daily" && (
            <div className="space-y-1.5">
              <Label htmlFor="recurrenceValue">
                {recurrenceFrequency === "weekly"
                  ? "星期（0=日，逗號分隔）"
                  : recurrenceFrequency === "monthly"
                    ? "日期（1-31，逗號分隔）"
                    : "月份-日期"}
              </Label>
              <Input
                id="recurrenceValue"
                value={recurrenceValue(recurrenceConfig)}
                onChange={(e) =>
                  setValue(
                    "recurrenceConfig",
                    serializeRecurrenceConfig(recurrenceFrequency, e.target.value),
                  )
                }
              />
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
