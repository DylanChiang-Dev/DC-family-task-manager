import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks";
import { NotificationBadge } from "@/features/notifications/NotificationBadge";
import { TeamSwitcher } from "@/features/teams/TeamSwitcher";
import { useAuthStore } from "@/stores/auth-store";

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold">家庭任務</span>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link className="rounded-md px-2 py-1 text-sm hover:bg-muted" to="/">任務</Link>
            <Link className="rounded-md px-2 py-1 text-sm hover:bg-muted" to="/categories">分類</Link>
            <NotificationBadge />
          </nav>
          <TeamSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.nickname}</span>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
            登出
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
