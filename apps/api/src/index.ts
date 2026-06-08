import { app } from "./app";
import type { Env } from "./types";
import { runDueReminders } from "./services/reminder";

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDueReminders(env));
  },
} satisfies ExportedHandler<Env>;
