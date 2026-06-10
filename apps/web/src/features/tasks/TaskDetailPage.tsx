import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import {
  useCreateTaskComment,
  useTask,
  useTaskComments,
  useTaskHistory,
  useUpdateTask,
} from "./hooks";
import { TaskProgressBar } from "./TaskProgressBar";

export function TaskDetailPage() {
  const id = Number(useParams().id);
  const { data: task, isLoading } = useTask(id);
  const { data: comments } = useTaskComments(id);
  const { data: history } = useTaskHistory(id);
  const commentMutation = useCreateTaskComment(id);
  const updateMutation = useUpdateTask();
  const [comment, setComment] = useState("");

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

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">返回任務列表</Link>
      </Button>

      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
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
      </Card>

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
    </div>
  );
}
