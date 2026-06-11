import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { TaskStatus } from "@ftm/shared";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import {
  useCreateTaskComment,
  useProjectTasks,
  useTask,
  useTaskComments,
  useTaskHistory,
  useUpdateTask,
} from "./hooks";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskProgressBar } from "./TaskProgressBar";

const STATUS_ORDER: Record<TaskStatus, number> = { in_progress: 0, pending: 1, completed: 2, cancelled: 3 };

export function TaskDetailPage() {
  const id = Number(useParams().id);
  const { data: task, isLoading } = useTask(id);
  // 內聯可選鏈比較才能讓 TS 在真分支收窄 task 非 undefined
  const { data: projectChildren } = useProjectTasks(task?.taskType === "project" ? task.id : Number.NaN);
  const { data: parentProject } = useTask(task?.projectId ?? Number.NaN);
  const { data: comments } = useTaskComments(id);
  const { data: history } = useTaskHistory(id);
  const commentMutation = useCreateTaskComment(id);
  const updateMutation = useUpdateTask();
  const [comment, setComment] = useState("");
  const [addingChild, setAddingChild] = useState(false);

  const submitComment = () => {
    const content = comment.trim();
    if (!content) return;
    commentMutation.mutate(
      { content },
      {
        onSuccess: () => setComment(""),
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "留言失敗"),
      },
    );
  };

  if (Number.isNaN(id)) {
    return <p className="text-destructive">任務 ID 無效</p>;
  }

  if (isLoading) {
    return <p className="text-muted-foreground">載入中...</p>;
  }

  if (!task) {
    return <p className="text-muted-foreground">找不到任務</p>;
  }

  const countable = (projectChildren ?? [])
    .filter((t) => (t.taskType === "normal" || t.taskType === "window") && !t.isBacklog)
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const rhythmTemplates = (projectChildren ?? []).filter(
    (t) => t.taskType === "recurring" && t.parentTaskId == null,
  );

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">返回任務列表</Link>
      </Button>

      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            {task.projectId != null && parentProject && (
              <p className="mb-1 text-sm text-muted-foreground">
                所屬項目：
                <Link className="underline-offset-4 hover:underline" to={`/tasks/${parentProject.id}`}>
                  {parentProject.title}
                </Link>
              </p>
            )}
            <h1 className="text-xl font-semibold">{task.title}</h1>
            <p className="text-sm text-muted-foreground">
              {task.status} · {task.priority}
              {task.dueDate ? ` · ${task.dueDate}` : ""}
            </p>
          </div>
          {task.categoryName && (
            <span className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: task.categoryColor ?? undefined }}>
              {task.categoryName}
            </span>
          )}
        </div>
        {task.description && <p className="whitespace-pre-wrap text-sm">{task.description}</p>}
        {task.taskType === "window" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              時間段：{task.startDate ?? "—"} ~ {task.endDate ?? "—"}
            </p>
            <TaskProgressBar
              value={task.progress}
              onChange={(next) =>
                updateMutation.mutate(
                  { id: task.id, input: { progress: next } },
                  { onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新失敗") },
                )
              }
            />
          </div>
        )}
        {task.taskType === "project" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              項目期間：{task.startDate ?? "—"} ~ {task.endDate ?? "—"}
            </p>
            <TaskProgressBar value={task.projectStats?.progress ?? 0} readOnly />
            <p className="text-sm text-muted-foreground">
              已完成 {task.projectStats?.completed ?? 0}/{task.projectStats?.total ?? 0}
            </p>
          </div>
        )}
      </Card>

      {task.taskType === "project" && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">子任務</h2>
            <Button size="sm" onClick={() => setAddingChild(true)}>
              新增子任務
            </Button>
          </div>
          {countable.length > 0 ? (
            <div className="space-y-2">
              {countable.map((child) => (
                <div key={child.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    aria-label={`完成 ${child.title}`}
                    checked={child.status === "completed"}
                    onChange={(e) =>
                      updateMutation.mutate(
                        { id: child.id, input: { status: e.target.checked ? "completed" : "pending" } },
                        { onError: (err) => toast.error(err instanceof ApiError ? err.message : "更新失敗") },
                      )
                    }
                  />
                  <Link
                    className="min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline"
                    to={`/tasks/${child.id}`}
                  >
                    {child.title}
                  </Link>
                  {child.dueDate && <span className="text-xs text-muted-foreground">{child.dueDate}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">尚未拆解任務</p>
          )}
          {rhythmTemplates.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <h3 className="text-sm font-medium">每日節奏</h3>
              {rhythmTemplates.map((tpl) => (
                <Link
                  key={tpl.id}
                  className="block truncate text-sm underline-offset-4 hover:underline"
                  to={`/tasks/${tpl.id}`}
                >
                  {tpl.title}
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">留言</h2>
        <div className="space-y-1.5">
          <label className="sr-only" htmlFor="comment">新增留言</label>
          <Textarea
            id="comment"
            aria-label="新增留言"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button onClick={submitComment} disabled={commentMutation.isPending}>
            送出留言
          </Button>
        </div>
        {(comments ?? []).length > 0 ? (
          <div className="space-y-2">
            {(comments ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border p-3">
                <p className="text-sm">{item.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.nickname}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">目前沒有留言</p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">歷史</h2>
        {(history ?? []).length > 0 ? (
          <div className="space-y-2">
            {(history ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <span className="font-medium">{item.action}</span>
                <span className="text-muted-foreground"> · {item.nickname}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">目前沒有歷史紀錄</p>
        )}
      </Card>

      {addingChild && (
        <TaskFormDialog open defaultProjectId={task.id} onOpenChange={(o) => !o && setAddingChild(false)} />
      )}
    </div>
  );
}
