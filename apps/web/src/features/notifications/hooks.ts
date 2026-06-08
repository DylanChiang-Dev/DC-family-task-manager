import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
    refetchInterval: 60_000,
  });
}

function useNotificationInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["notifications"] });
}

export function useMarkNotificationRead() {
  const invalidate = useNotificationInvalidation();
  return useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useNotificationInvalidation();
  return useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
}

export function useDeleteNotification() {
  const invalidate = useNotificationInvalidation();
  return useMutation({ mutationFn: deleteNotification, onSuccess: invalidate });
}
