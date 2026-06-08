# 重构设计文档（Rebuild Design Docs）

> 状态：设计中（草案）｜最后更新：2026-06-08
> 这是 DC-family-task-manager 从「原生 PHP + 原生 JS + MySQL」重构为「全 Cloudflare 全栈 TypeScript」的**完整设计文档集**。
> 本阶段只做设计、不写实现代码。所有决策确认后，再进入编码阶段。

## 这套文档要解决什么

把一个能用但难维护的旧系统（30 个 PHP 脚本 + 2835 行 `app.js` + 手写 MySQL）重建为：

- **现代化**：全栈 TypeScript，端到端类型安全。
- **零运维**：全部托管 Cloudflare（Pages + Workers + D1 + KV + R2 + Cron），告别宝塔 / Docker。
- **可开源**：单仓库 monorepo，clone 即可跑起全栈，架构清晰。
- **移动端友好**：响应式 + PWA 优先，未来可扩展到原生 App。

技术栈定稿见上层 [`../REBUILD_TECH_STACK.md`](../REBUILD_TECH_STACK.md)。

## 阅读顺序

| # | 文档 | 内容 |
|---|------|------|
| 01 | [01-architecture.md](./01-architecture.md) | 架构总览：分层、Cloudflare 服务协作、请求生命周期、核心决策 |
| 02 | [02-monorepo.md](./02-monorepo.md) | Monorepo 目录结构：apps/web、apps/api、packages/shared 的职责与依赖 |
| 03 | [03-database.md](./03-database.md) | D1 数据库设计：Drizzle 重写 8 张表、MySQL→SQLite 差异、索引 |
| 04 | [04-api.md](./04-api.md) | API 设计：所有 REST 端点、请求/响应、错误规范、老 API 映射 |
| 05 | [05-auth.md](./05-auth.md) | 认证方案：JWT + KV session、注册/登录/刷新/登出、中间件 |
| 06 | [06-frontend.md](./06-frontend.md) | 前端架构：路由、状态、组件分层、TanStack Query、PWA、农历移植 |
| 07 | [07-scheduled-tasks.md](./07-scheduled-tasks.md) | 定时任务与通知：Cron Triggers 处理周期任务与到期提醒 |
| 08 | [08-shared-and-roadmap.md](./08-shared-and-roadmap.md) | 共享层（Zod 前后端共用）+ 分阶段实施路线图 |

## 文档约定

- **语言**：中文，详细到可直接照着实现。
- **代码片段**：仅用于表达设计意图（schema、类型、目录树、接口形状），不代表最终实现，编码阶段以实际代码为准。
- **"老系统"** 指当前 `public/` 下的 PHP 版本；**"新系统"** 指本文档描述的目标架构。
- **决策标记**：✅ 已定稿 ｜ ⚠️ 需注意/有取舍 ｜ ❓ 待确认。

## 关键背景约束（已确认）

- 老系统生产数据**不迁移**，全新开始 → schema 可用最佳实践，无需兼容旧数据。
- 单仓库 monorepo，**非**两仓库。
- 现有功能需全部保留（见各文档"老系统行为契约"小节）。
