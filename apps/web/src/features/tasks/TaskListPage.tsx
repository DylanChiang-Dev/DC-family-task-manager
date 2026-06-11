import { useState } from "react";
import type { TaskResponse, TaskStatus, TaskType } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import type { TaskStatusFilter } from "./api";
import { useDeleteTask, useTasks, useUpdateTask } from "./hooks";
import { TaskCard } from "./TaskCard";
import { TaskFormDialog } from "./TaskFormDialog";

const FILTERS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待處理" },
  { value: "in_progress", label: "進行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

type TypeFilter = TaskType | "all";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "全部類型" },
  { value: "normal", label: "一般" },
  { value: "recurring", label: "週期" },
  { value: "window", label: "時間段" },
  { value: "project", label: "項目" },
];

export function TaskListPage() {
  const [filter, setFilter] = useState<TaskStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [editing, setEditing] = useState<TaskResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: tasks, isLoading } = useTasks(filter);
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const onStatusChange = (task: TaskResponse, status: TaskStatus) => {
    updateMutation.mutate(
      { id: task.id, input: { status } },
      { onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新失敗") },
    );
  };

  const visible = (tasks ?? []).filter(
    (t) => !t.isBacklog && (typeFilter === "all" || t.taskType === typeFilter),
  );

  const onDelete = (task: TaskResponse) => {
    if (!confirm(`確定刪除任務「${task.title}」？`)) return;

    deleteMutation.mutate(task.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除失敗"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as TaskStatusFilter)}>
            <SelectTrigger className="w-32" aria-label="篩選狀態">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-32" aria-label="篩選類型">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreating(true)}>新增任務</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">載入中...</p>
      ) : visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onStatusChange={(s) => onStatusChange(t, s)}
              onEdit={() => setEditing(t)}
              onDelete={() => onDelete(t)}
            />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">目前沒有任務</p>
      )}

      {creating && <TaskFormDialog open onOpenChange={(o) => !o && setCreating(false)} />}
      {editing && (
        <TaskFormDialog open task={editing} onOpenChange={(o) => !o && setEditing(null)} />
      )}
    </div>
  );
}
