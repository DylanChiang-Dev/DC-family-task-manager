import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTaskInput } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";
import {
  createTask,
  deleteTask,
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
