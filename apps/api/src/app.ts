import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./types";
import { fail, ok } from "./lib/response";
import { authRoutes } from "./routes/auth";
import { teamRoutes } from "./routes/team";
import { taskRoutes } from "./routes/task";
import { categoryRoutes } from "./routes/category";
import { notificationRoutes } from "./routes/notification";
import { profileRoutes } from "./routes/profile";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return "";
      const extra = (c.env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const allowed = [...DEV_ORIGINS, ...extra];
      if (allowed.includes(origin)) return origin;
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

// Public routes
app.route("/api/auth", authRoutes);

// Authenticated routes (no team context needed)
app.route("/api/notifications", notificationRoutes);
app.route("/api/profile", profileRoutes);

// Team-scoped routes
app.route("/api/teams", teamRoutes);
app.route("/api/tasks", taskRoutes);
app.route("/api/categories", categoryRoutes);

app.notFound((c) => c.json(fail("NOT_FOUND", "Route not found"), 404));

app.onError((err, c) => {
  const isDev = c.env.ENVIRONMENT === "development";
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[api error]", msg, err instanceof Error ? err.stack : "");
  return c.json(fail("INTERNAL", isDev ? msg : "Internal Server Error"), 500);
});
