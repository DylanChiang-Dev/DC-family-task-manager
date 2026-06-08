import type { TaskPriority, TaskStatus, TaskType, TeamRole, HistoryAction } from "../constants/enums";
import type { RecurrenceConfig } from "../schemas/recurrence";

// ── API 響應包裝類型 ──

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
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

// ── Team 響應 ──
export interface TeamDetail {
  id: number;
  name: string;
  inviteCode: string;
  createdBy: number;
  createdAt: number;
  updatedAt: number;
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: number;
  username: string;
  nickname: string;
  role: TeamRole;
  joinedAt: number;
}

// ── Task 響應 ──
export interface TaskResponse {
  id: number;
  teamId: number;
  title: string;
  description: string | null;
  creatorId: number;
  creatorNickname: string;
  assigneeId: number | null;
  assigneeNickname: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  taskType: TaskType;
  recurrenceConfig: RecurrenceConfig | null;
  parentTaskId: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// ── Category 響應 ──
export interface CategoryResponse {
  id: number;
  teamId: number;
  name: string;
  color: string;
  creatorId: number;
  createdAt: number;
}

// ── Task Comment 響應 ──
export interface TaskCommentResponse {
  id: number;
  teamId: number;
  taskId: number;
  userId: number;
  username: string;
  nickname: string;
  content: string;
  createdAt: number;
}

// ── Task History 響應 ──
export interface TaskHistoryResponse {
  id: number;
  taskId: number;
  userId: number;
  username: string;
  nickname: string;
  action: HistoryAction;
  changes: Record<string, unknown>;
  createdAt: number;
}

// ── Notification 響應 ──
export interface NotificationResponse {
  id: number;
  userId: number;
  createdBy: number | null;
  createdByName: string | null;
  createdByNickname: string | null;
  taskId: number | null;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: number;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  unreadCount: number;
}

// ── Profile 響應 ──
export interface ProfileResponse {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  currentTeamId: number | null;
  createdAt: number;
  updatedAt: number;
}
