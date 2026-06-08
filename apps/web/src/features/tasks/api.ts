import type {
  CreateTaskInput,
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

export function createTask(input: CreateTaskInput) {
  return request<TaskResponse>("/tasks", { method: "POST", body: input });
}

export function updateTask(id: number, input: UpdateTaskInput) {
  return request<TaskResponse>(`/tasks/${id}`, { method: "PATCH", body: input });
}

export function deleteTask(id: number) {
  return request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
}
