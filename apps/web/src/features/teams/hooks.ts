import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { fetchTeams, switchTeam } from "./api";

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
}

export function useSwitchTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: switchTeam,
    onSuccess: ({ currentTeamId }) => {
      useAuthStore.getState().setCurrentTeamId(currentTeamId);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
