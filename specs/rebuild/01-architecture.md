# 01 · 架构总览

> 上层文档：[README](./README.md) ｜ 下一篇：[02 Monorepo 结构](./02-monorepo.md)

## 1. 一句话架构

> 一个 React SPA（Cloudflare Pages）通过 HTTPS 调用一个 Hono API（Cloudflare Workers），后者用 Drizzle 读写 D1（SQLite），用 KV 存会话/缓存、R2 存文件，用 Cron Triggers 跑定时任务；前后端共享一份 Zod schema 保证端到端类型安全。

## 2. 系统分层图

```
┌──────────────────────────── 用户设备 ────────────────────────────┐
│  浏览器 / 手机浏览器（PWA，可“添加到主屏幕”）                      │
└───────────────────────────────┬──────────────────────────────────┘
                                 │ HTTPS (JSON)
                                 ▼
┌──────────────────────── Cloudflare 边缘网络 ─────────────────────┐
│                                                                   │
│  ┌─────────────────────┐        ┌──────────────────────────────┐ │
│  │  Cloudflare Pages   │        │     Cloudflare Workers       │ │
│  │  ─────────────────  │  fetch │     ──────────────────       │ │
│  │  React SPA (静态)   │ ─────▶ │     Hono App (API)           │ │
│  │  Vite 构建产物      │        │     · 路由 / 中间件          │ │
│  │  PWA Service Worker │        │     · 鉴权（JWT 验证）       │ │
│  └─────────────────────┘        │     · 业务逻辑               │ │
│                                 │     · Zod 校验               │ │
│                                 └───────┬──────────────────────┘ │
│                                         │ Drizzle ORM            │
│         ┌───────────────┬───────────────┼───────────────┐       │
│         ▼               ▼               ▼               ▼       │
│   ┌──────────┐   ┌──────────┐    ┌──────────┐   ┌──────────┐   │
│   │    D1    │   │    KV    │    │    R2    │   │  Email   │   │
│   │ (SQLite) │   │(session, │    │ (头像等  │   │ (Resend) │   │
│   │ 业务数据 │   │  缓存)   │    │  文件)   │   │          │   │
│   └──────────┘   └──────────┘    └──────────┘   └──────────┘   │
│                                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Cron Triggers → 同一个 Worker 的 scheduled() 处理函数   │   │
│   │  · 每日扫描即将到期任务 → 写通知 / 发邮件                │   │
│   └─────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

## 3. 三个运行时单元

| 单元 | 跑在哪 | 职责 | 不负责 |
|------|--------|------|--------|
| **Web（前端）** | Cloudflare Pages | UI 渲染、路由、本地状态、调 API、PWA、农历计算（纯前端） | 业务规则、鉴权信任边界 |
| **API（后端）** | Cloudflare Workers | 所有业务逻辑、鉴权、数据读写、校验，是唯一可信边界 | UI |
| **Scheduled（定时）** | 同一个 Worker 的 `scheduled` 入口 | 到期提醒等周期性后台作业 | 处理用户请求 |

> ⚠️ **信任边界只有一条**：Workers。前端的任何校验都只是体验优化，所有规则必须在 Workers 端重新校验（Zod schema 前后端共用，但执行点在后端）。

## 4. 请求生命周期（以"创建任务"为例）

```
1. 用户在 React 表单点“创建” 
2. 前端用共享的 Zod schema 先做一次本地校验（即时反馈）
3. TanStack Query 的 mutation 发起 POST /api/tasks
   Header: Authorization: Bearer <JWT>
4. Workers 入口 → Hono 路由匹配 POST /tasks
5. 中间件链：
   a. CORS
   b. auth 中间件：验证 JWT 签名 + 过期 → 解出 userId
   c. team 中间件：读出当前 teamId，校验用户是该团队成员
6. handler：用 Zod 再次校验 body（不信任前端）
7. Drizzle 写入 D1：insert task
8. 副作用：写 task_history、（若分配他人）写 notification
9. 返回 201 + 新任务 JSON
10. 前端 TanStack Query 收到结果 → 自动失效 tasks 查询缓存 → UI 刷新
```

## 5. 为什么这样分（核心决策回顾）

| 决策 | 选择 | 理由 | 替代方案与放弃原因 |
|------|------|------|-------------------|
| 整体架构 | 前后端分离 | 贴合作者既有心智（Go 后端 + CF Pages）；Hono 近似 Echo/Fiber；开源易懂 | 一体化（TanStack Start/Next）：双重新事物，学习曲线陡 |
| 后端框架 | Hono | 为 Workers 而生、极轻、中间件模型清晰、类型友好 | itty-router 太裸；Next API routes 绑定一体化 |
| 数据库 | D1 (SQLite) + Drizzle | 全 CF 生态零运维；数据量小 SQLite 足够；Drizzle 类型安全 + 自动迁移 | 外部 Postgres：多一个外部依赖，违背“全 CF”目标 |
| 会话 | JWT + KV | Workers 无常驻内存、无本地文件，无法用传统 PHP session；JWT 无状态天然适配边缘 | 纯 cookie session：边缘多节点难共享状态 |
| 前端 | React + Vite | 生态最大、AI 辅助最强、可复用到 RN | Vue：作者未表达偏好，React 求职/开源面更广 |
| 校验 | Zod（前后端共享） | 一份 schema 两端用，类型从 schema 推导 | 各写一套：易不同步 |

## 6. 与老系统的关键差异

| 维度 | 老系统（PHP） | 新系统（CF 全栈） |
|------|--------------|------------------|
| 后端形态 | 多个独立 PHP 脚本，按文件路由 | 单个 Worker，Hono 内部路由 |
| 鉴权 | PHP session（文件）+ cookie | JWT（无状态）+ KV（refresh/黑名单） |
| 周期任务 | **前端**渲染时动态生成虚拟实例 | 前端展示逻辑保留 + **后端 Cron** 真正驱动到期提醒 |
| 到期提醒 | 有方法但**无自动触发**（缺口） | Cron Triggers 每日自动扫描 ✅ 补齐 |
| 邮件 | MailService 存在但通知未真正发邮件 | Resend 集成，可选开启 |
| 农历 | 纯前端 JS（自包含） | 原样移植为 TS 模块 |
| 类型安全 | 无 | 端到端 TypeScript + Zod |
| 部署 | 宝塔 / Docker | `wrangler deploy` + Pages 自动构建 |

## 7. 环境与配置（概览，细节见各文档）

- **机密**：JWT 密钥、Resend API Key 等 → Workers Secrets（`wrangler secret put`），绝不进仓库。
- **绑定**：D1 / KV / R2 在 `wrangler.toml` 里以 binding 注入 Worker。
- **环境分层**：`development`（本地 `wrangler dev` + 本地 D1）、`production`（线上）。预览环境可选。
- **前端环境变量**：仅 `VITE_API_BASE_URL` 一类非机密项，注入构建。

## 8. 本文档未决问题

- ❓ 是否需要"实时同步"（多端同时在线即时刷新）？老系统宣称有。若需要 → 引入 Durable Objects + WebSocket；若不需要 → TanStack Query 轮询/手动刷新即可。**建议先不做实时，PWA + 拉取已足够，按需再加。**
- ❓ 邮件通知是否一定要：建议默认关闭、留好接口，开源用户自行配 Resend。
