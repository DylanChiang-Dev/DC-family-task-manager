import type {
  CreateCommentInput,
  CreateTaskInput,
  TaskCommentResponse,
  TaskHistoryResponse,
  TaskResponse,
  TaskStatus,
  UpdateTaskInput,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export type TaskStatusFilter = TaskStatus | "all";

export interface TaskListFilter {
  /** YYYY-MM-DD，與 to 構成日期重疊過濾（無日期任務會被排除） */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
  /** 1-500；offset 必須搭配 limit */
  limit?: number;
  offset?: number;
}

export function fetchTasks(status: TaskStatusFilter, filter?: TaskListFilter) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (filter?.from) params.set("from", filter.from);
  if (filter?.to) params.set("to", filter.to);
  if (filter?.limit != null) params.set("limit", String(filter.limit));
  if (filter?.offset != null) params.set("offset", String(filter.offset));
  const qs = params.toString();
  return request<TaskResponse[]>(`/tasks${qs ? `?${qs}` : ""}`);
}

export function fetchTask(id: number) {
  return request<TaskResponse>(`/tasks/${id}`);
}

export function createTask(input: CreateTaskInput) {
  return request<TaskResponse>("/tasks", { method: "POST", body: input });
}

export function updateTask(id: number, input: UpdateTaskInput) {
  return request<TaskResponse>(`/tasks/${id}`, { method: "PATCH", body: input });
}

export function deleteTask(id: number) {
  return request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
}

export function fetchTaskComments(id: number) {
  return request<TaskCommentResponse[]>(`/tasks/${id}/comments`);
}

export function createTaskComment(id: number, input: CreateCommentInput) {
  return request<TaskCommentResponse>(`/tasks/${id}/comments`, {
    method: "POST",
    body: input,
  });
}

export function fetchTaskHistory(id: number) {
  return request<TaskHistoryResponse[]>(`/tasks/${id}/history`);
}
