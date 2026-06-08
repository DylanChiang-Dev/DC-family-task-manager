# 07 · 定时任务与通知

> 上一篇：[06 前端架构](./06-frontend.md) ｜ 下一篇：[08 共享层与路线图](./08-shared-and-roadmap.md)

## 1. 背景：老系统的缺口

- 老系统 `NotificationService::checkAndSendDueReminders()` 能扫描即将到期任务并写通知，但**没有自动触发器**——它得靠手动调用或外部 cron，实际上是个缺口。
- 老系统所有通知**只写库、不发邮件**（MailService 存在但通知未接入）。

新系统用 **Cloudflare Cron Triggers** 补齐自动化，并把邮件作为可选能力接好。

## 2. Cron Triggers 工作机制

- 在 `wrangler.toml` 声明 cron 表达式，Cloudflare 在对应时间调用同一个 Worker 的 `scheduled()` 入口。
- 与 `fetch()` 共享同一份代码与绑定（D1/KV/R2/Secrets），无需另起服务。

```ts
// apps/api/src/index.ts
export default {
  fetch: app.fetch,                       // 处理 HTTP 请求
  async scheduled(event, env, ctx) {      // 处理定时任务
    ctx.waitUntil(runDueReminders(env));
  },
};
```

```toml
# wrangler.toml
[triggers]
crons = ["0 1 * * *"]   # 每天 UTC 01:00（按需调整为家庭所在时区的清晨）
```

## 3. 定时作业一：到期提醒（due_reminder）

```
每日 cron 触发 runDueReminders(env):
1. 计算时间窗口：今天 → 未来 24/48 小时内 due_date 的任务
2. 查询 D1：status NOT IN ('completed','cancelled') AND due_date 命中窗口
3. 对每个任务的 assignee（或 creator，若无 assignee）：
   a. 去重：同任务同类型当天是否已发过（查 notifications 近一天）
   b. 写一条 notification(type='due_reminder')
   c. 若该用户有 email 且开启邮件 → 调 Resend 发送
4. 用 D1 batch 批量写，减少往返
```

- 窗口大小、提醒提前量可配置（沿用老系统 `hours_before` 概念，默认 24h）。

## 4. 定时作业二：周期任务（recurring）落实

> 关键设计决策。老系统周期任务**只在前端虚拟展开**、不落库。新系统两种策略：

| 策略 | 做法 | 取舍 |
|------|------|------|
| **A. 保持前端虚拟展开**（推荐第一版） | 后端只存规则；前端日历渲染时展开；Cron 仅负责"对今天命中的周期任务发到期提醒" | 简单、不产生重复数据；缺点：周期实例不是独立可操作记录（不能单独标记某一天完成） |
| **B. Cron 物化实例** | 每日 cron 把"今天命中的 recurring 任务"实例化为真实 task 记录（带 parentTaskId） | 每个实例可独立完成/评论；缺点：产生大量记录，需要去重与清理 |

- ✅ **第一版采用 A**：与老系统行为一致，风险最低。Cron 对周期任务的作用仅限"根据规则判断今天是否到期 → 发提醒"。
- 若后续需要"单独完成某天的周期任务"，再升级到 B。

判断"今天是否命中"复用与前端相同的纯函数规则（`shouldShowRecurringTask`），该函数放在 `packages/shared` 里前后端共用，避免两处实现漂移。

## 5. 通知系统（运行时，非定时）

沿用并补全老系统的通知类型：

| 类型 | 触发点 | 接收人 | 发邮件 |
|------|--------|--------|--------|
| `task_assigned` | 创建/改派任务给他人 | 被分配者 | 可选 |
| `status_changed` | 任务状态变更 | creator + assignee（变更者本人除外） | 可选 |
| `task_deleted` | 删除任务 | creator + assignee | 可选 |
| `due_reminder` | Cron 扫描 | assignee/creator | 可选 |
| `team_invite` | 加入团队（预留） | 被邀请者 | 可选 |

- 去重规则由触发端控制（与老系统一致）：变更者本人不通知、assignee==creator 不重复。
- 通知一律先写 D1；邮件为可选增强。

## 6. 邮件（Resend，可选）

```ts
// services/mail.ts
async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return;        // 未配置则静默跳过
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to, subject, html }),
  });
}
```

- 默认关闭（无 key 则跳过），开源用户自行配置 `RESEND_API_KEY` + `MAIL_FROM`。
- 也可用 Cloudflare **Email Workers** 发信，但 Resend 更省心。

## 7. 可观测性与幂等

- **幂等**：定时作业必须可重复执行不出错（cron 可能重试）。到期提醒靠"当天去重查询"保证不重复轰炸。
- **日志**：`scheduled()` 内 `console.log` 关键统计（扫描数、发送数），可在 Cloudflare 控制台/Logpush 查看。
- **失败隔离**：单个用户邮件失败不应中断整个批次（try/catch 包裹每条）。

## 8. 时区注意

- D1 时间统一存 UTC 毫秒；`due_date` 存 `YYYY-MM-DD`（当地日期语义）。
- Cron 表达式是 UTC。家庭用户多在同一时区，把 cron 设在"当地清晨"对应的 UTC 时间即可（如东八区清晨 8 点 = UTC 0 点）。
- ⚠️ 若未来跨时区用户多，再引入每用户时区字段，按用户时区判断"今天"。

## 9. 决策标记

- ✅ Cron Triggers 跑每日到期提醒（补齐老系统缺口）。
- ✅ 周期任务第一版维持"前端虚拟展开 + 后端按规则提醒"（策略 A）。
- ✅ `shouldShowRecurringTask` 纯函数放 shared，前后端共用。
- ⚠️ 邮件默认关闭、可选开启（Resend）。
- ❓ 是否需要物化周期实例（策略 B）：按需再做。
