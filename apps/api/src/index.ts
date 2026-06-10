import { app } from "./app";
import type { Env } from "./types";
import { runDueReminders } from "./services/reminder";
import { generateAllRecurringInstances } from "./services/recurrence";

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    // 先補齊週期實例，再跑到期提醒（提醒會掃到新生的實例）
    ctx.waitUntil(
      generateAllRecurringInstances(env).then(() => runDueReminders(env)),
    );
  },
} satisfies ExportedHandler<Env>;
