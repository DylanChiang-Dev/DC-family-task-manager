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

export function fetchTasks(status: TaskStatusFilter) {
  const qs = status === "all" ? "" : `?status=${status}`;
  return request<TaskResponse[]>(`/tasks${qs}`);
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
