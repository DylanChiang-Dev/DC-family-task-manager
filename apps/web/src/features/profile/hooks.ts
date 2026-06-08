import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser, UpdateProfileInput } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";
import { fetchProfile, updateProfile } from "./api";

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (profile) => {
      const user: AuthUser = {
        id: profile.id,
        username: profile.username,
        nickname: profile.nickname,
        email: profile.email,
        currentTeamId: profile.currentTeamId,
        createdAt: profile.createdAt,
      };

      useAuthStore.getState().setUser(user);
      qc.setQueryData(["profile"], profile);
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}
