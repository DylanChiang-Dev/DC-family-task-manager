import { z } from "zod";

// ── 註冊 ──
export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "用戶名至少 3 個字符")
      .max(50, "用戶名最多 50 個字符"),
    password: z
      .string()
      .min(6, "密碼至少 6 個字符")
      .max(128, "密碼最多 128 個字符"),
    nickname: z
      .string()
      .trim()
      .min(1, "暱稱不能為空")
      .max(30, "暱稱最多 30 個字符"),
    teamOption: z.enum(["create", "join"]),
    teamName: z.string().trim().min(1).max(50).optional(),
    inviteCode: z.string().trim().length(6).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.teamOption === "join" && !data.inviteCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "加入團隊需要提供邀請碼",
        path: ["inviteCode"],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ── 登錄 ──
export const loginSchema = z.object({
  username: z.string().trim().min(1, "用戶名不能為空"),
  password: z.string().min(1, "密碼不能為空"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ── 刷新 Token ──
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

// ── 登出 ──
export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

// ── 更新個人資料 ──
export const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(30).optional(),
  email: z.string().email().max(255).nullable().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6).max(128).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
