# 重构技术栈决策（Rebuild Tech Stack Decision）

> 状态：已定稿（2026-06-08）
> 目标：将现有「原生 PHP + 原生 JS + MySQL」的家庭任务管理系统，重构为现代化、全 Cloudflare 生态、可开源、移动端友好的全栈 TypeScript 应用。

## 一、背景与目标

- **现状痛点**
  - 后端：30 个原生 PHP 文件，无框架、无依赖管理（无 composer），API 为一堆独立脚本。
  - 前端：单个 `app.js` 达 2835 行，纯原生 DOM 操作，不可维护。
  - 数据库：MySQL 5.7+，手写 `schema.sql` + 手动 migrations。
  - 部署：依赖宝塔 / Docker，运维成本高。
- **重构目标**
  1. 技术栈现代化，脱离 PHP。
  2. 做成可开源的产品级项目，架构经得起推敲。
  3. 彻底告别宝塔 / Docker 运维 —— 全部托管在 Cloudflare。
  4. 移动端友好：网页移动端优先（PWA），未来可扩展到原生 App。

## 二、最终技术栈

| 层 | 技术 | 部署目标 |
|---|---|---|
| 前端框架 | React + TypeScript + Vite | Cloudflare Pages |
| UI | Tailwind CSS + shadcn/ui（响应式 / PWA） | — |
| 数据请求 | TanStack Query | — |
| 后端框架 | Hono（TypeScript，写法近似 Go 的 Echo/Fiber） | Cloudflare Workers |
| 校验 | Zod（前后端共享 schema） | — |
| 数据库 | Cloudflare D1（SQLite）+ Drizzle ORM | Cloudflare D1 |
| 会话/缓存 | Cloudflare KV | Cloudflare KV |
| 文件存储 | Cloudflare R2（头像等，可选） | Cloudflare R2 |
| 定时任务 | Cloudflare Cron Triggers（周期任务 / 定时通知） | Workers |
| 邮件通知 | Resend 或 Email Workers | — |
| 手机端 | PWA 优先，未来可复用到 Expo / React Native | — |

## 三、关键决策与理由

1. **架构风格：前后端分离（Hono on Workers + React on Pages）**
   - 贴合作者既有习惯（Go 后端 + CF Pages 前端），心智模型不变，仅把后端语言换为 TypeScript。
   - Hono 写法近似 Echo/Fiber，迁移平滑；开源后他人最易理解。
   - 不选 TanStack Start / Next.js：对作者而言是「新框架 + 新部署适配」双重新事物，分离方案更聚焦。

2. **数据库：Cloudflare D1 + Drizzle ORM**
   - 家庭任务管理数据量极小，SQLite 10GB 上限绰绰有余。
   - 全在 CF 生态内，零运维。
   - Drizzle 提供类型安全与自动迁移，替代手写 schema.sql。

3. **手机端：PWA 优先**
   - Tailwind + shadcn 做响应式，手机浏览器即用，可「添加到主屏幕」，支持离线与推送。
   - 未来若上架，React 组件可复用到 Expo（RN），后端 Workers API 不变。

## 四、现有功能 → 新技术映射

| 现有功能 | 新方案 |
|---|---|
| 多团队 / 邀请码加入 | D1 表 + Hono 路由 |
| 任务 CRUD / 分类 / 历史 | Drizzle + D1 |
| 周期任务、定时通知 | Cloudflare Cron Triggers |
| 农历计算 | 移植现有纯 JS 逻辑 |
| 通知系统 | D1 存通知 + Resend 发邮件 |
| 实时数据同步（可选） | Durable Objects |
| Session 认证（bcrypt） | JWT / Lucia + KV 存 session |

## 五、现有数据库表（待用 Drizzle 重写）

`teams`、`users`、`team_members`、`tasks`、`task_comments`、`categories`、`task_history`、`notifications`（共 8 张）。

迁移时需处理 MySQL → SQLite 差异：`ENUM`（改为 text + check 约束）、`JSON`（D1 用 text 存 JSON）、`AUTO_INCREMENT`（integer primary key autoincrement）、`TIMESTAMP`（integer/text）、`UNSIGNED`（SQLite 无此概念）。

## 六、已确认事项（2026-06-08）

- [x] 老系统生产数据**不迁移**，全新开始 → schema 用最佳实践，无旧数据兼容负担。
- [x] **单仓库 monorepo**（pnpm workspace：apps/web + apps/api + packages/shared），非两仓库。
- [x] 推进方式：**先出完整设计文档再动手**。

## 七、完整设计文档

详见 [`rebuild/`](./rebuild/) 目录（共 9 份）：架构、Monorepo、数据库、API、认证、前端、定时任务、共享层与路线图。从 [rebuild/README.md](./rebuild/README.md) 开始读。
