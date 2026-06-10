import type { TaskResponse } from "@ftm/shared";
import { useTasks } from "@/features/tasks/hooks";

export function filterBacklog(tasks: TaskResponse[] | undefined): TaskResponse[] {
  return (tasks ?? []).filter((t) => t.isBacklog);
}

export function useBacklogTasks() {
  const { data, isLoading } = useTasks("all");
  return { backlog: filterBacklog(data), isLoading };
}
