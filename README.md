# 家庭任務管理系統 | Family Task Manager

> 全 Cloudflare 全棧重構版（進行中）。技術棧：**Hono + React + Cloudflare D1**，端到端 TypeScript。
> 舊版（PHP）已歸檔至 [`legacy/`](./legacy/)。

## 技術棧

| 層 | 技術 | 部署 |
|---|---|---|
| 前端 | React + TypeScript + Vite + Tailwind + shadcn/ui | Cloudflare Pages |
| 後端 | Hono (TypeScript) + Zod | Cloudflare Workers |
| 數據庫 | Cloudflare D1 (SQLite) + Drizzle ORM | Cloudflare D1 |
| 會話/緩存 | Cloudflare KV ｜ 文件 R2 ｜ 定時 Cron Triggers | Cloudflare |

完整設計文檔見 [`specs/rebuild/`](./specs/rebuild/)。

## 倉庫結構（monorepo · pnpm workspace）

```
apps/
  api/        Hono 後端 → Cloudflare Workers
  web/        React 前端 → Cloudflare Pages
packages/
  shared/     前後端共享：Zod schema、類型、枚舉常量
specs/        設計文檔
legacy/       舊版 PHP 項目（重構完成後移除）
```

## 開發

前置：Node ≥ 20、pnpm ≥ 9。

```bash
pnpm install            # 安裝所有 workspace 依賴
pnpm dev:api            # 本地啟動後端 Worker（wrangler dev，默認 :8787）
pnpm dev:web:prod       # 本地啟動前端，直接連 production 後端

# 健康檢查
curl http://localhost:8787/api/health
```

## 當前進度

- [x] 設計文檔定稿（specs/rebuild）
- [x] Phase 0：monorepo 脚手架 + 後端 health 接口
- [x] Phase 1：D1 schema + 認證（JWT + KV）
- [x] Phase 2：團隊與任務 CRUD
- [x] Phase 3：分類、評論、通知
- [x] Phase 4：日歷、週期任務、農曆
- [x] Phase 5：定時任務與郵件
- [x] Phase 6：前端 PWA 與上線

## License

MIT
