// ── API 響應包裝類型 ──

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Auth 響應 ──
export interface AuthUser {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  currentTeamId: number | null;
  createdAt: number;
}

export interface AuthTeam {
  id: number;
  name: string;
  inviteCode: string;
  role: "admin" | "member";
}

export interface RegisterResponse {
  user: AuthUser;
  team: AuthTeam;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: AuthUser;
  team: AuthTeam | null;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: AuthUser;
  teams: AuthTeam[];
  currentTeam: AuthTeam | null;
}
