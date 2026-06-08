import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCommentInput, UpdateTaskInput } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";
import {
  createTask,
  createTaskComment,
  deleteTask,
  fetchTask,
  fetchTaskComments,
  fetchTaskHistory,
  fetchTasks,
  updateTask,
  type TaskStatusFilter,
} from "./api";

export function useTasks(status: TaskStatusFilter) {
  const teamId = useAuthStore((s) => s.currentTeamId);

  return useQuery({
    queryKey: ["tasks", teamId, status],
    queryFn: () => fetchTasks(status),
    enabled: teamId != null,
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ["tasks", "detail", id],
    queryFn: () => fetchTask(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useTaskComments(id: number) {
  return useQuery({
    queryKey: ["tasks", id, "comments"],
    queryFn: () => fetchTaskComments(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateTaskComment(id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommentInput) => createTaskComment(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", id, "comments"] }),
  });
}

export function useTaskHistory(id: number) {
  return useQuery({
    queryKey: ["tasks", id, "history"],
    queryFn: () => fetchTaskHistory(id),
    enabled: Number.isFinite(id),
  });
}
