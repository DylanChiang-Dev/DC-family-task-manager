import { useEffect } from "react";
import type { ApiResponse } from "@ftm/shared";
import { fetchMe } from "@/features/auth/api";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export function useBootstrapAuth() {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return;

        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (!json.success) return;

        useAuthStore.getState().setAccessToken(json.data.accessToken);
        const me = await fetchMe();
        if (cancelled) return;

        useAuthStore.getState().setAuth({
          accessToken: json.data.accessToken,
          user: me.user,
          currentTeamId: me.currentTeam?.id ?? me.user.currentTeamId,
        });
      } catch {
        useAuthStore.getState().clearAuth();
      } finally {
        if (!cancelled) useAuthStore.getState().setBootstrapped(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return isBootstrapped;
}
