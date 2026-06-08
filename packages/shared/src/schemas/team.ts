import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "團隊名稱不能為空").max(50, "團隊名稱最多 50 個字符"),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const joinTeamSchema = z.object({
  inviteCode: z.string().trim().length(6, "邀請碼必須為 6 位"),
});

export type JoinTeamInput = z.infer<typeof joinTeamSchema>;

export const switchTeamSchema = z.object({
  teamId: z.number().int().positive(),
});

export type SwitchTeamInput = z.infer<typeof switchTeamSchema>;

export const updateTeamSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
});

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
