import type { TeamsListResponse } from "@ftm/shared";
import { request } from "@/lib/api-client";

export function fetchTeams() {
  return request<TeamsListResponse>("/teams");
}

export function switchTeam(teamId: number) {
  return request<{ currentTeamId: number }>("/teams/switch", {
    method: "POST",
    body: { teamId },
  });
}
