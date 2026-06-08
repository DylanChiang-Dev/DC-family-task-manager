import type { TaskResponse, TaskStatus } from "@ftm/shared";
import { Link } from "react-router-dom";
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

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待處理",
  in_progress: "進行中",
  completed: "已完成",
  cancelled: "已取消",
};

const PRIORITY_LABEL: Record<TaskResponse["priority"], string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: TaskResponse;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link className="truncate font-medium underline-offset-4 hover:underline" to={`/tasks/${task.id}`}>
            {task.title}
          </Link>
          <Badge variant="secondary">{PRIORITY_LABEL[task.priority]}</Badge>
          {task.categoryName && (
            <Badge style={{ backgroundColor: task.categoryColor ?? undefined }}>
              {task.categoryName}
            </Badge>
          )}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {task.assigneeNickname ? `指派給 ${task.assigneeNickname}` : "未指派"}
          {task.dueDate ? ` · 截止 ${task.dueDate}` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
          <SelectTrigger className="w-28" aria-label="狀態">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          編輯
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          刪除
        </Button>
      </div>
    </Card>
  );
}
