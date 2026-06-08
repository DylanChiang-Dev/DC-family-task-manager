import { app } from "./app";
import type { Env } from "./types";

// Worker 入口：fetch 處理 HTTP；scheduled 處理 Cron（Phase 5 啟用）。
export default {
  fetch: app.fetch,

  // async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
  //   ctx.waitUntil(runDueReminders(env));
  // },
} satisfies ExportedHandler<Env>;
