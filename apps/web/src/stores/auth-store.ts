import type { AuthUser } from "@ftm/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  currentTeamId: number | null;
  isBootstrapped: boolean;
  setAccessToken: (token: string) => void;
  setAuth: (p: { accessToken: string; user: AuthUser; currentTeamId: number | null }) => void;
  setCurrentTeamId: (id: number) => void;
  setBootstrapped: (v: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      currentTeamId: null,
      isBootstrapped: false,
      setAccessToken: (token) => set({ accessToken: token }),
      setAuth: ({ accessToken, user, currentTeamId }) =>
        set({ accessToken, user, currentTeamId }),
      setCurrentTeamId: (id) => set({ currentTeamId: id }),
      setBootstrapped: (v) => set({ isBootstrapped: v }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "ftm-auth",
      partialize: (s) => ({ currentTeamId: s.currentTeamId }),
    },
  ),
);
