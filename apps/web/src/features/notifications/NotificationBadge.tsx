import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "./hooks";

export function NotificationBadge() {
  const { data } = useNotifications(false);
  const unread = data?.unreadCount ?? 0;

  return (
    <Link className="relative rounded-md px-2 py-1 text-sm hover:bg-muted" to="/notifications">
      通知
      {unread > 0 && (
        <Badge className="ml-1 h-5 min-w-5 px-1" variant="destructive">
          {unread}
        </Badge>
      )}
    </Link>
  );
}
