import { useState } from "react";
import type { TaskResponse } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useCreateTask, useDeleteTask } from "@/features/tasks/hooks";
import { TaskFormDialog } from "@/features/tasks/TaskFormDialog";
import { useBacklogTasks } from "./hooks";

export function BacklogDrawer() {
  const { backlog, isLoading } = useBacklogTasks();
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [promoting, setPromoting] = useState<TaskResponse | null>(null);
  const createMutation = useCreateTask();
  const deleteMutation = useDeleteTask();

  const onCapture = () => {
    const t = title.trim();
    if (!t) return;
    createMutation.mutate(
      { title: t, taskType: "normal", isBacklog: true, progress: 0 } as any,
      {
        onSuccess: () => setTitle(""),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "加入失敗"),
      },
    );
  };

  const onDelete = (task: TaskResponse) => {
    if (!confirm(`從靈感箱刪除「${task.title}」？`)) return;
    deleteMutation.mutate(task.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除失敗"),
    });
  };

  return (
    <Card className="p-3" aria-label="靈感箱">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">🗂 靈感箱</h2>
          <p className="text-sm text-muted-foreground">先放著的想法，成熟了再升級成任務</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "收起" : `展開（${backlog.length}）`}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="backlogCapture">捕捉靈感</Label>
              <Input
                id="backlogCapture"
                aria-label="捕捉靈感"
                value={title}
                placeholder="想到什麼，先記下來…"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onCapture();
                  }
                }}
              />
            </div>
            <Button onClick={onCapture} disabled={createMutation.isPending}>
              加入靈感箱
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">載入中...</p>
          ) : backlog.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">靈感箱是空的</p>
          ) : (
            <div className="space-y-2">
              {backlog.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background/70 p-2"
                >
                  <span className="min-w-0 truncate text-sm">{task.title}</span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      aria-label={`升級 ${task.title}`}
                      onClick={() => setPromoting(task)}
                    >
                      升級
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onDelete(task)}
                    >
                      刪除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {promoting && (
        <TaskFormDialog
          open
          promote
          task={promoting}
          onOpenChange={(o) => {
            if (!o) setPromoting(null);
          }}
        />
      )}
    </Card>
  );
}
