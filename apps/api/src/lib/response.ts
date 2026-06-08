// 統一響應封套（見 specs/rebuild/04-api.md §2）。
// 成功：{ success: true, data }
// 失敗：{ success: false, error: { code, message, details? } }

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

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ApiError {
  return { success: false, error: { code, message, details } };
}
