import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateScheduleBlockInput } from "@ftm/shared";
import {
  createScheduleBlock,
  deleteScheduleBlock,
  fetchScheduleBlocks,
  updateScheduleBlock,
} from "./api";

export function useScheduleBlocks(start: string, end: string) {
  return useQuery({
    queryKey: ["schedule-blocks", start, end],
    queryFn: () => fetchScheduleBlocks(start, end),
  });
}

function useScheduleBlockInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["schedule-blocks"] });
}

export function useCreateScheduleBlock() {
  const invalidate = useScheduleBlockInvalidation();
  return useMutation({ mutationFn: createScheduleBlock, onSuccess: invalidate });
}

export function useUpdateScheduleBlock() {
  const invalidate = useScheduleBlockInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateScheduleBlockInput }) =>
      updateScheduleBlock(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteScheduleBlock() {
  const invalidate = useScheduleBlockInvalidation();
  return useMutation({ mutationFn: deleteScheduleBlock, onSuccess: invalidate });
}
