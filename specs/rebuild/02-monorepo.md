# 02 · Monorepo 目录结构

> 上一篇：[01 架构总览](./01-architecture.md) ｜ 下一篇：[03 数据库](./03-database.md)

## 1. 为什么 monorepo（而非两个仓库）

运行时分离 ≠ 代码仓库分离。单仓库带来：

- **共享类型/校验**：前后端 import 同一份 Zod schema，后端改字段前端立刻类型报错。
- **原子提交**：一个 PR 同时改通前后端，好回溯。
- **开源体验**：clone 一个仓库即可跑全栈。
- **一条命令起全栈**：`pnpm dev` 同时拉起 Worker 和 Vite。

工具选 **pnpm workspace**（轻量、磁盘省、CF 生态常用）。规模再大可加 Turborepo 做任务编排，初期不需要。

## 2. 目录树

```
family-task-manager/
├── apps/
│   ├── web/                      # ① 前端 → Cloudflare Pages
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/           # 页面级路由组件
│   │   │   ├── components/       # 通用组件
│   │   │   │   └── ui/           # shadcn/ui 生成的组件
│   │   │   ├── features/         # 按功能切分（tasks/teams/auth/...）
│   │   │   │   ├── tasks/        #   组件 + hooks + api 调用
│   │   │   │   ├── teams/
│   │   │   │   ├── auth/
│   │   │   │   ├── categories/
│   │   │   │   └── notifications/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts # 封装 fetch + JWT 注入
│   │   │   │   ├── query.ts      # TanStack Query client
│   │   │   │   └── lunar.ts      # 农历（从老 JS 移植）
│   │   │   ├── stores/           # 轻量全局状态（auth/当前团队）
│   │   │   └── styles/
│   │   ├── public/               # 静态资源 + PWA manifest/icons
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                      # ② 后端 → Cloudflare Workers
│       ├── src/
│       │   ├── index.ts          # Worker 入口：export default { fetch, scheduled }
│       │   ├── app.ts            # Hono 实例 + 路由挂载
│       │   ├── routes/           # 按资源分组的路由
│       │   │   ├── auth.ts
│       │   │   ├── tasks.ts
│       │   │   ├── teams.ts
│       │   │   ├── categories.ts
│       │   │   └── notifications.ts
│       │   ├── middleware/
│       │   │   ├── auth.ts       # JWT 验证 → 注入 userId
│       │   │   ├── team.ts       # 当前团队 + 成员校验
│       │   │   └── error.ts      # 统一错误处理
│       │   ├── db/
│       │   │   ├── schema.ts     # Drizzle 表定义（D1）
│       │   │   ├── client.ts     # drizzle(env.DB) 工厂
│       │   │   └── migrations/   # drizzle-kit 生成的 SQL 迁移
│       │   ├── services/         # 业务逻辑（不依赖 HTTP）
│       │   │   ├── task-history.ts
│       │   │   ├── notification.ts
│       │   │   └── mail.ts       # Resend 封装（可选）
│       │   ├── scheduled/        # Cron 处理
│       │   │   └── due-reminders.ts
│       │   └── lib/
│       │       ├── jwt.ts
│       │       ├── password.ts   # bcrypt/scrypt（见 05）
│       │       └── invite-code.ts
│       ├── wrangler.toml         # Worker 配置 + D1/KV/R2 绑定 + cron
│       ├── drizzle.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                   # ③ 前后端共享
│       ├── src/
│       │   ├── schemas/          # Zod schema（任务/团队/用户/...）
│       │   │   ├── task.ts
│       │   │   ├── team.ts
│       │   │   ├── auth.ts
│       │   │   ├── category.ts
│       │   │   └── notification.ts
│       │   ├── types/            # 从 Zod 推导的 TS 类型 + API 响应类型
│       │   ├── constants/        # 枚举常量（优先级/状态/频率/角色）
│       │   └── index.ts          # 统一导出
│       ├── tsconfig.json
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json                  # 根：脚本、devDeps、workspace 声明
├── tsconfig.base.json            # 共享 TS 配置，各包 extends
├── .gitignore
├── .env.example
├── biome.json 或 eslint+prettier # 代码风格统一
└── README.md
```

## 3. 各包职责与依赖方向

```
        ┌─────────────────┐
        │ packages/shared │  ← 零运行时依赖，纯类型 + Zod + 常量
        └────────┬────────┘
                 │ 被依赖
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────┐       ┌─────────┐
   │ apps/web│       │ apps/api│
   └─────────┘       └─────────┘
```

- **依赖方向单向**：`web` 和 `api` 都依赖 `shared`；`shared` 不依赖任何 app。
- **`shared` 必须运行时无副作用**：不能 import 浏览器或 Node/Workers 专有 API，否则两端无法共用。只放 Zod schema、类型、纯常量。
- workspace 内引用：`"@ftm/shared": "workspace:*"`（包名前缀 `@ftm` 示意，可改）。

## 4. 关键配置文件要点

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 根 `package.json` 脚本（示意）
```jsonc
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",        // 同时起 web + api
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",      // wrangler dev
    "build": "pnpm -r build",
    "db:generate": "pnpm --filter api db:generate",  // drizzle-kit 生成迁移
    "db:migrate": "pnpm --filter api db:migrate",    // 应用到 D1
    "typecheck": "pnpm -r typecheck",
    "lint": "biome check ."
  }
}
```

### `tsconfig.base.json`
- `strict: true`，`moduleResolution: "Bundler"`。
- path alias：`@ftm/shared` → `packages/shared/src`。
- 各包 `tsconfig.json` 用 `extends: "../../tsconfig.base.json"`。

### `apps/api/wrangler.toml`（绑定示意，细节见 03/05/07）
```toml
name = "ftm-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ftm"
database_id = "<填入>"

[[kv_namespaces]]
binding = "SESSIONS"
id = "<填入>"

[[r2_buckets]]
binding = "FILES"
bucket_name = "ftm-files"

[triggers]
crons = ["0 1 * * *"]   # 每日 01:00 UTC 扫描到期任务
```

## 5. 本地开发流程（概览）

1. `pnpm install`
2. `pnpm --filter api db:generate && pnpm --filter api db:migrate`（建本地 D1）
3. `pnpm dev` → Worker 在 `:8787`，Vite 在 `:5173`
4. 前端 `VITE_API_BASE_URL=http://localhost:8787` 指向本地 Worker
5. CORS 在 Hono 中按环境放行本地源

## 6. 部署拓扑

- **api**：`wrangler deploy`（或 GitHub Actions），产出一个 Workers 服务。
- **web**：连 GitHub 到 Cloudflare Pages，push 自动构建 `apps/web`（构建命令指定子目录）。
- 两者独立部署、独立回滚；通过 `VITE_API_BASE_URL` 解耦。

## 7. 决策标记

- ✅ pnpm workspace 单仓库。
- ✅ `shared` 只放纯 Zod/类型/常量，保证两端可用。
- ⚠️ 包命名前缀 `@ftm/*` 为示意，编码时可统一改名。
- ❓ 是否引入 Turborepo：初期不引入，构建慢了再加。
