// 統一響應封套（見 specs/rebuild/04-api.md §2）。
// 成功：{ success: true, data }
// 失敗：{ success: false, error: { code, message, details? } }

// 類型從 shared 統一導入，避免重複定義
export type { ApiSuccess, ApiError } from "@ftm/shared";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export function ok<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: unknown,
): { success: false; error: { code: ErrorCode; message: string; details?: unknown } } {
  return { success: false, error: { code, message, details } };
}
