# 08 · 共享层与实施路线图

> 上一篇：[07 定时任务](./07-scheduled-tasks.md) ｜ 回到 [README](./README.md)

## 第一部分：共享层（packages/shared）

### 1. 为什么存在

前后端共用**同一份事实来源**：枚举常量、Zod 校验 schema、从 schema 推导的 TS 类型。改一处，两端同时受益且类型联动报错。

### 2. 内容边界（必须无副作用）

只放：
- Zod schema
- 从 Zod 推导的类型 + API 响应类型
- 纯常量（枚举）
- 纯函数（如 `shouldShowRecurringTask`、农历可选放这）

不放：任何浏览器 API、Workers API、Node API、副作用代码。

### 3. Zod schema 示例

```ts
// packages/shared/src/schemas/task.ts
import { z } from 'zod';
import { TASK_PRIORITY, TASK_STATUS, TASK_TYPE, RECURRENCE_FREQ } from '../constants/enums';

export const recurrenceConfigSchema = z.discriminatedUnion('frequency', [
  z.object({ frequency: z.literal('daily') }),
  z.object({ frequency: z.literal('weekly'), days: z.array(z.number().min(0).max(6)).min(1) }),
  z.object({ frequency: z.literal('monthly'), dates: z.array(z.number().min(1).max(31)).min(1) }),
  z.object({ frequency: z.literal('yearly'), month: z.number().min(1).max(12), date: z.number().min(1).max(31) }),
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  priority: z.enum(TASK_PRIORITY).default('medium'),
  status: z.enum(TASK_STATUS).default('pending'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  taskType: z.enum(TASK_TYPE).default('normal'),
  recurrenceConfig: recurrenceConfigSchema.nullable().optional(),
  parentTaskId: z.number().int().positive().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

用法：
- **后端**：`zValidator('json', createTaskSchema)` 校验请求体。
- **前端**：React Hook Form 的 `zodResolver(createTaskSchema)` 校验表单。
- **类型**：两端都 import `CreateTaskInput`。

### 4. 与 Drizzle 的关系

- Drizzle 也能用 `drizzle-zod` 从表生成基础 schema。
- 推荐：**手写 API 层 Zod schema**（输入校验，含业务规则如 max 长度），与 DB 层解耦；DB 类型用 Drizzle 的 `InferSelectModel`。两者职责不同，不强行合并。

---

## 第二部分：分阶段实施路线图

> 原则：先打通"一条端到端的垂直切片"（登录→建任务→看列表），再横向铺功能。每阶段产出**可运行**的东西，便于随时验证。

### Phase 0 · 项目脚手架（地基）
- 初始化 pnpm workspace：`apps/web`、`apps/api`、`packages/shared`。
- 配好 TS base config、Biome/ESLint、`.env.example`。
- `apps/api`：Hono + wrangler 跑通 `GET /api/health`。
- `apps/web`：Vite + React + Tailwind + shadcn 初始化，跑通空白页。
- **验收**：`pnpm dev` 同时起前后端，health 接口可访问。

### Phase 1 · 数据层与认证（垂直切片的底座）
- `packages/shared`：先写 auth + task 的 Zod schema 与枚举常量。
- `apps/api`：Drizzle schema（8 表）+ 首个迁移 + 本地 D1 建库。
- 实现注册/登录/refresh/logout/me + JWT 中间件 + KV refresh。
- **验收**：能注册、登录拿到 token、`/auth/me` 返回用户与团队。

### Phase 2 · 团队与任务 CRUD（核心垂直切片打通）
- 后端：`/teams`（创建/加入/切换/成员）+ `/tasks`（CRUD + history）。
- 前端：登录页 + 团队切换器 + 任务列表 + 创建/编辑任务表单（接 TanStack Query）。
- **验收**：浏览器里完成"注册→建团队→创建任务→改状态→看列表"全流程。

### Phase 3 · 分类、评论、通知
- 后端：`/categories`、任务评论、`/notifications` + 运行时通知（assigned/status_changed/deleted）。
- 前端：分类管理（admin）、通知中心 + 红点、任务历史展示。
- **验收**：分配任务给他人 → 对方通知中心出现红点。

### Phase 4 · 日历、周期任务、农历
- 前端：日历月视图；移植 `shouldShowRecurringTask` 与农历模块（JS→TS）。
- `shared`：放周期判断纯函数（前后端共用）。
- **验收**：创建每周一三五的周期任务，日历正确显示；农历日期显示正确。

### Phase 5 · 定时任务与邮件
- 后端：`scheduled()` + cron，每日到期提醒；Resend 可选邮件。
- **验收**：构造一个明天到期的任务，本地 `wrangler dev --test-scheduled` 触发后产生提醒。

### Phase 6 · PWA、打磨、上线
- PWA（manifest + SW + 离线读）、暗色模式、移动端导航、空状态/加载态打磨。
- 部署：Pages 接 GitHub 自动构建；`wrangler deploy` 上 Worker；配 Secrets 与绑定。
- 开源准备：README、LICENSE、`.env.example`、一键部署说明。
- **验收**：线上可用，手机"添加到主屏幕"体验顺畅。

### 里程碑依赖关系

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──▶ Phase 5 ──▶ Phase 6
 脚手架     认证地基     核心打通      协作功能     日历/周期    定时/邮件    PWA/上线
```

## 第三部分：开源与质量

- **测试**：后端关键业务（鉴权、任务 CRUD、权限、周期判断）写 Vitest 单测；可选 Workers 集成测试（`@cloudflare/vitest-pool-workers`）。
- **CI**：GitHub Actions 跑 typecheck + lint + test，PR 必过。
- **文档**：本 specs/rebuild 作为设计依据；README 面向使用者；CONTRIBUTING 面向贡献者。
- **一键部署**：提供 `wrangler.toml` 模板 + 部署步骤，让别人能快速跑起自己的实例。

## 决策标记

- ✅ shared 放 Zod schema + 类型 + 枚举 + 纯函数，无副作用。
- ✅ 垂直切片优先的 6 阶段路线图。
- ⚠️ DB 层与 API 层 schema 分离，不强行合并。
- ❓ 测试覆盖范围按精力定，至少覆盖鉴权与任务核心逻辑。
