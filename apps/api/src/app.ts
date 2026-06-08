import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./types";
import { fail, ok } from "./lib/response";
import { authRoutes } from "./routes/auth";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── 全局中間件 ──
app.use(
  "*",
  cors({
    // 開發期放行本地前端；生產環境收緊為實際 Pages 域名。
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Team-Id"],
    credentials: true,
  }),
);

// ── 健康檢查 ──
app.get("/api/health", (c) =>
  c.json(
    ok({
      status: "ok",
      service: "ftm-api",
      environment: c.env.ENVIRONMENT,
      time: new Date().toISOString(),
    }),
  ),
);

// ── 業務路由 ──
app.route("/api/auth", authRoutes);
// app.route("/api/tasks", taskRoutes);
// ...

// ── 404 與統一錯誤處理 ──
app.notFound((c) => c.json(fail("NOT_FOUND", "Route not found"), 404));

app.onError((err, c) => {
  console.error("[api error]", err);
  return c.json(fail("INTERNAL", "Internal server error"), 500);
});
