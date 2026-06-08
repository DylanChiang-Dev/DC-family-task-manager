import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "./hooks";

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications(unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const onError = (e: unknown, fallback: string) =>
    toast.error(e instanceof ApiError ? e.message : fallback);

  const notifications = data?.notifications ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">通知中心</h1>
          <p className="text-sm text-muted-foreground">未讀 {data?.unreadCount ?? 0} 則</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setUnreadOnly((v) => !v)}>
            {unreadOnly ? "顯示全部" : "只看未讀"}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              markAllRead.mutate(undefined, {
                onError: (e) => onError(e, "標記全部已讀失敗"),
              })
            }
          >
            全部已讀
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">載入中...</p>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((item) => (
            <Card key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{item.content}</p>
                <p className="text-sm text-muted-foreground">
                  {item.createdByNickname ?? item.createdByName ?? "系統"} · {item.type}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!item.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      markRead.mutate(item.id, {
                        onError: (e) => onError(e, "標記已讀失敗"),
                      })
                    }
                  >
                    標記已讀
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    deleteMutation.mutate(item.id, {
                      onError: (e) => onError(e, "刪除通知失敗"),
                    })
                  }
                >
                  刪除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">目前沒有通知</p>
      )}
    </div>
  );
}
