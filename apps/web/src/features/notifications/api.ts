import type { NotificationListResponse } from "@ftm/shared";
import { request } from "@/lib/api-client";

export function fetchNotifications(unreadOnly = false) {
  const qs = unreadOnly ? "?unreadOnly=true" : "";
  return request<NotificationListResponse>(`/notifications${qs}`);
}

export function markNotificationRead(id: number) {
  return request<{ message: string }>(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return request<{ message: string }>("/notifications/read-all", { method: "POST" });
}

export function deleteNotification(id: number) {
  return request<{ message: string }>(`/notifications/${id}`, { method: "DELETE" });
}
