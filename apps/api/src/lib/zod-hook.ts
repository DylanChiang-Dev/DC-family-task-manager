import type { Context } from "hono";
import { fail } from "./response";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodErrorHook(result: { success: boolean; error?: any; data?: unknown }, c: Context) {
  if (!result.success) {
    return c.json(
      fail("VALIDATION_ERROR", "請求參數驗證失敗", result.error?.flatten?.()),
      400,
    );
  }
}
