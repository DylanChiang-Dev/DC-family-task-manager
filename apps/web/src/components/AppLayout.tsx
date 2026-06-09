import { Link } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks";
import { NotificationBadge } from "@/features/notifications/NotificationBadge";
import { TeamSwitcher } from "@/features/teams/TeamSwitcher";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";

const NAV_ITEMS = [
  { to: "/", label: "工作台" },
  { to: "/teams", label: "團隊" },
  { to: "/categories", label: "分類" },
  { to: "/settings", label: "我的" },
];

const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS.slice(0, 1),
  { to: "/notifications", label: "通知" },
  ...NAV_ITEMS.slice(1),
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <div className="min-h-svh pb-16 sm:pb-0">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold">家庭任務</span>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} className="rounded-md px-2 py-1 text-sm hover:bg-muted" to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
          <NotificationBadge />
          <TeamSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.nickname}</span>
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? "亮色" : "暗色"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
            登出
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background sm:hidden">
        {MOBILE_NAV_ITEMS.map((item) => (
          <Link key={item.to} className="py-3 text-center text-sm" to={item.to}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
