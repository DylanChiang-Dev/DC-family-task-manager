import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./types";
import { fail, ok } from "./lib/response";
import { authRoutes } from "./routes/auth";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// 允許的前端來源白名單
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "";
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      return "";
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Team-Id"],
    credentials: true,
  }),
);

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

app.route("/api/auth", authRoutes);

app.notFound((c) => c.json(fail("NOT_FOUND", "Route not found"), 404));

app.onError((err, c) => {
  const isDev = c.env.ENVIRONMENT === "development";
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[api error]", msg, err instanceof Error ? err.stack : "");
  return c.json(fail("INTERNAL", isDev ? msg : "Internal Server Error"), 500);
});
