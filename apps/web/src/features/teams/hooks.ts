import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTeamInput, JoinTeamInput, UpdateTeamInput } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";
import {
  createTeam,
  deleteTeam,
  fetchTeam,
  fetchTeamMembers,
  fetchTeams,
  joinTeam,
  regenerateInviteCode,
  removeTeamMember,
  switchTeam,
  updateTeam,
} from "./api";

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: ["teams", id],
    queryFn: () => fetchTeam(id),
    enabled: Number.isFinite(id),
  });
}

export function useTeamMembers(id: number) {
  return useQuery({
    queryKey: ["teams", id, "members"],
    queryFn: () => fetchTeamMembers(id),
    enabled: Number.isFinite(id),
  });
}

function invalidateTeamState(qc: ReturnType<typeof useQueryClient>, teamId?: number) {
  qc.invalidateQueries({ queryKey: ["teams"] });
  if (teamId) {
    qc.invalidateQueries({ queryKey: ["teams", teamId] });
    qc.invalidateQueries({ queryKey: ["teams", teamId, "members"] });
  }
}

export function useSwitchTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: switchTeam,
    onSuccess: ({ currentTeamId }) => {
      useAuthStore.getState().setCurrentTeamId(currentTeamId);
      invalidateTeamState(qc, currentTeamId);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTeamInput) => createTeam(input),
    onSuccess: (team) => {
      useAuthStore.getState().setCurrentTeamId(team.id);
      invalidateTeamState(qc, team.id);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useJoinTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: JoinTeamInput) => joinTeam(input),
    onSuccess: (team) => {
      useAuthStore.getState().setCurrentTeamId(team.id);
      invalidateTeamState(qc, team.id);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateTeam(id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTeamInput) => updateTeam(id, input),
    onSuccess: () => invalidateTeamState(qc, id),
  });
}

export function useRegenerateInviteCode(id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => regenerateInviteCode(id),
    onSuccess: () => invalidateTeamState(qc, id),
  });
}

export function useRemoveTeamMember(id: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => removeTeamMember(id, userId),
    onSuccess: () => invalidateTeamState(qc, id),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: (_, deletedTeamId) => {
      const currentTeamId = useAuthStore.getState().currentTeamId;
      if (currentTeamId === deletedTeamId) {
        useAuthStore.getState().setCurrentTeamId(null);
      }
      invalidateTeamState(qc, deletedTeamId);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
