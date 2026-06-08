import type {
  CreateTeamInput,
  JoinTeamInput,
  TeamDetail,
  TeamMember,
  TeamRole,
  TeamsListResponse,
  UpdateTeamInput,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export interface TeamMutationResponse {
  id: number;
  name: string;
  inviteCode: string;
  role: TeamRole;
  createdAt: number;
}

export function fetchTeams() {
  return request<TeamsListResponse>("/teams");
}

export function fetchTeam(id: number) {
  return request<TeamDetail>(`/teams/${id}`);
}

export function fetchTeamMembers(id: number) {
  return request<TeamMember[]>(`/teams/${id}/members`);
}

export function createTeam(input: CreateTeamInput) {
  return request<TeamMutationResponse>("/teams", { method: "POST", body: input });
}

export function joinTeam(input: JoinTeamInput) {
  return request<TeamMutationResponse>("/teams/join", { method: "POST", body: input });
}

export function switchTeam(teamId: number) {
  return request<{ currentTeamId: number }>("/teams/switch", {
    method: "POST",
    body: { teamId },
  });
}

export function updateTeam(id: number, input: UpdateTeamInput) {
  return request<{ id: number; name: string; updatedAt: number }>(`/teams/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function regenerateInviteCode(id: number) {
  return request<{ inviteCode: string }>(`/teams/${id}/invite-code`, { method: "POST" });
}

export function removeTeamMember(teamId: number, userId: number) {
  return request<{ message: string }>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export function deleteTeam(id: number) {
  return request<{ message: string }>(`/teams/${id}`, { method: "DELETE" });
}
