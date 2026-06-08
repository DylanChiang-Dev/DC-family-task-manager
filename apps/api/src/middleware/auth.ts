import type { MiddlewareHandler } from "hono";
import { verifyAccessToken } from "../lib/jwt";
import type { Env, Variables } from "../types";

// JWT 驗證中間件：從 Authorization header 取 Bearer token，驗證後注入 userId
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: Variables;
}> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "未登錄" } },
      401,
    );
  }

  const token = header.slice(7);
  const payload = await verifyAccessToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Token 無效或已過期" },
      },
      401,
    );
  }

  c.set("userId", payload.sub);
  await next();
};
