import type {
  CreateScheduleBlockInput,
  ScheduleBlockResponse,
  UpdateScheduleBlockInput,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export function fetchScheduleBlocks(start: string, end: string) {
  return request<ScheduleBlockResponse[]>(`/schedule-blocks?start=${start}&end=${end}`);
}

export function createScheduleBlock(input: CreateScheduleBlockInput) {
  return request<ScheduleBlockResponse>("/schedule-blocks", { method: "POST", body: input });
}

export function updateScheduleBlock(id: number, input: UpdateScheduleBlockInput) {
  return request<ScheduleBlockResponse>(`/schedule-blocks/${id}`, { method: "PATCH", body: input });
}

export function deleteScheduleBlock(id: number) {
  return request<{ message: string }>(`/schedule-blocks/${id}`, { method: "DELETE" });
}
