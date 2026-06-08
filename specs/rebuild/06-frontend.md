# 06 · 前端架构

> 上一篇：[05 认证](./05-auth.md) ｜ 下一篇：[07 定时任务](./07-scheduled-tasks.md)

## 1. 目标

把老系统 2835 行的 `app.js`（命令式 DOM 操作）重建为组件化、类型安全、移动端优先的 React SPA，并支持 PWA。

## 2. 技术选型

| 关注点 | 选择 | 说明 |
|--------|------|------|
| 框架 | React 18 + TypeScript | 组件化 |
| 构建 | Vite | 快、CF Pages 友好 |
| 路由 | React Router | SPA 路由；也可选 TanStack Router（类型更强） |
| 服务端状态 | TanStack Query | 缓存、loading/error、失效重取，取代手写 fetch |
| 客户端状态 | Zustand（轻量） | 仅放 auth/当前团队等少量全局态 |
| 样式 | Tailwind CSS | 实用类、响应式、移动优先 |
| 组件库 | shadcn/ui | 基于 Radix，可定制、可访问性好 |
| 表单 | React Hook Form + Zod resolver | 复用 shared 的 Zod schema |
| 图标 | lucide-react | shadcn 默认搭配 |
| PWA | vite-plugin-pwa（Workbox） | manifest + service worker |

## 3. 状态管理分层（重要）

```
┌─────────────────────────────────────────────┐
│ 服务端状态（TanStack Query）                  │
│  tasks / teams / categories / notifications   │  ← 绝大多数数据
│  缓存 + 自动失效 + 乐观更新                    │
├─────────────────────────────────────────────┤
│ 客户端全局状态（Zustand）                     │
│  auth（user, accessToken）                    │  ← 极少量
│  currentTeamId（影响所有请求的 X-Team-Id）    │
├─────────────────────────────────────────────┤
│ 组件局部状态（useState）                      │
│  表单输入、弹窗开关、UI 临时态                 │
└─────────────────────────────────────────────┘
```

> 原则：**能用 TanStack Query 就不要塞进全局 store**。服务器数据归 Query，全局 store 只留真正跨页面的少量客户端态。

## 4. 目录与功能切分（feature-based）

```
src/features/
├── auth/         登录/注册页、useAuth、登录态守卫
├── tasks/        任务列表/卡片/表单/详情/历史、useTasks/useCreateTask...
├── teams/        团队切换器、成员管理、邀请码、设置
├── categories/   分类管理（admin）
├── notifications/通知中心、红点、useNotifications
└── calendar/     日历视图 + 周期任务虚拟实例展开 + 农历
```

每个 feature 内含：`components/`、`hooks/`（封装 TanStack Query 的 useXxx）、`api.ts`（该资源的请求函数）。

## 5. API 客户端封装

```ts
// lib/api-client.ts
async function request<T>(path, options): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const teamId = useAuthStore.getState().currentTeamId;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(teamId && { 'X-Team-Id': String(teamId) }),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    // 尝试 refresh → 成功则重放；失败则登出跳登录
  }
  const json = await res.json();
  if (!json.success) throw new ApiError(json.error);
  return json.data as T;
}
```

TanStack Query hook 示例：
```ts
// features/tasks/hooks.ts
export const useTasks = (status: TaskStatus | 'all') =>
  useQuery({ queryKey: ['tasks', teamId, status], queryFn: () => fetchTasks(status) });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
};
```

> `queryKey` 带上 `teamId` → 切换团队时缓存天然隔离、自动重取。

## 6. 路由结构（示意）

```
/login                 登录/注册（公开）
/                      仪表盘（任务概览）
/tasks                 任务列表（状态筛选）
/tasks/:id             任务详情 + 历史 + 评论
/calendar              日历视图（周期任务 + 农历）
/teams                 团队管理 / 切换
/teams/:id/members     成员管理（admin）
/categories            分类管理（admin）
/notifications         通知中心
/settings              个人资料 / 改密码
```

- 路由守卫：未登录访问受保护路由 → 重定向 `/login`。
- 移动端：底部 Tab 导航（任务/日历/通知/我的）；桌面端侧边栏。

## 7. 周期任务的前端处理（保留老系统逻辑）

老系统在前端日历渲染时动态展开虚拟实例，新前端**原样保留这套纯函数逻辑**：

```ts
// features/calendar/recurrence.ts
function shouldShowRecurringTask(date: Date, cfg: RecurrenceConfig): boolean {
  switch (cfg.frequency) {
    case 'daily':   return true;
    case 'weekly':  return cfg.days.includes(date.getDay());        // 0=Sun
    case 'monthly': return cfg.dates.includes(date.getDate());
    case 'yearly':  return date.getMonth()+1===cfg.month && date.getDate()===cfg.date;
  }
}

function generateRecurringInstances(tasks, startDate, endDate) {
  // 对 task_type==='recurring' 的任务，在日期范围内逐日判断，
  // 命中则生成虚拟实例 { ...task, isRecurringInstance:true, dueDate:thatDay }
  // 不落库，仅渲染用
}
```

## 8. 农历移植

- 老系统 `lunar.js` / `lunar-accurate.js` 是**纯前端、自包含、无依赖**的计算（覆盖 1900–2100），导出到 window。
- 迁移做法：移植为 TS 模块 `lib/lunar.ts`，导出 `solarToLunar(year, month, day)`，去掉 window 全局、改 ES module 导出。
- 优先采用更稳定的 `lunar-accurate.js`（class 实现）那套。
- ⚠️ 逻辑不重写，只做 JS→TS 包装 + 类型标注，降低出错风险。

## 9. PWA 设计

- `vite-plugin-pwa` 生成 manifest（名称、图标、`display: standalone`、主题色）+ service worker。
- 缓存策略：
  - 静态资源（JS/CSS/字体/图标）→ 预缓存（precache）。
  - API 请求 → 网络优先（NetworkFirst），离线时回退缓存（任务列表可离线查看）。
- "添加到主屏幕"后像 App 一样全屏运行。
- ❓ 离线写操作（离线创建任务后同步）：第一版**不做**，仅离线读；需要再加 background sync。

## 10. UI/UX 要点

- **移动优先**：Tailwind 断点从小到大；触摸目标 ≥44px。
- 关键交互：任务卡片快速改状态、下拉切团队、通知红点、日历月视图。
- 暗色模式：Tailwind `dark:` + shadcn 主题，低成本支持。
- 国际化：界面以繁体中文为主（沿用老系统），文案集中管理便于未来 i18n。

## 11. 决策标记

- ✅ React + Vite + TanStack Query + Tailwind + shadcn + Zustand(极简)。
- ✅ 周期任务展开 + 农历逻辑从老系统移植（不重写算法）。
- ⚠️ 路由库 React Router vs TanStack Router：默认 React Router，想要极致类型安全可换。
- ❓ 离线写 / 实时同步：第一版不做。
