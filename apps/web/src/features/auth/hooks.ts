import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { login, logout, register } from "./api";

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      useAuthStore.getState().setAuth({
        accessToken: data.accessToken,
        user: data.user,
        currentTeamId: data.team?.id ?? data.user.currentTeamId,
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      useAuthStore.getState().setAuth({
        accessToken: data.accessToken,
        user: data.user,
        currentTeamId: data.team.id,
      });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().clearAuth();
      qc.clear();
    },
  });
}
