# MEMORY.md — 家庭任務管理系統

## Policy

- Read this file top-to-bottom on session start; search with narrow keywords before diving into linked specs.
- Record durable decisions, deployment facts, and repeated gotchas here.
- Do not record secrets or raw `.env` values. Do not paste bulk generated output here — link to artifacts instead.
- Newer entries go above older ones within each section.

## Current Repository Facts

- Owner: `DylanChiang-Dev`
- Local path: `/Users/dc/Documents/DylanChiang-Dev/DC-family-task-manager`
- Main branch: `main`
- Production API: `https://ftm-api.dylan-chiang.workers.dev`
- Production web: `https://dc-family-task-manager.pages.dev`
- D1 database ID: `98a7d90d-edad-46ea-9806-b9d09b3145e1` (database name: `ftm`)
- KV namespace ID: `569ea27912b8430bab8602a231fe20b2` (binding: `SESSIONS`)

## Durable Decisions

### 2026-06-11 — Production Worker/Pages 刪除後全量重建（wrangler 已升 4.x）

- D1 與 KV 獨立於 Worker/Pages 存在，刪 Worker 不丟數據與賬號；但 **secrets 隨 Worker 一起消失，重建後必須重設** `JWT_SECRET`/`JWT_REFRESH_SECRET`（隨機生成即可——密碼哈希自帶 salt，與 JWT secret 無關，換 secret 不影響既有賬號登入）。
- 名稱互相鎖定，重建必須複用：Worker = `ftm-api`（前端硬編碼其 URL），Pages = `dc-family-task-manager`（API 的 `ALLOWED_ORIGINS` 指向該域名）。
- 重建命令序列：
  ```bash
  # API
  pnpm --filter @ftm/api run deploy
  cd apps/api
  openssl rand -base64 48 | npx wrangler secret put JWT_SECRET --env production
  openssl rand -base64 48 | npx wrangler secret put JWT_REFRESH_SECRET --env production
  # Web（web 無 deploy 腳本；wrangler 裝在 apps/api）
  pnpm --filter @ftm/web build
  cd apps/web
  ../api/node_modules/.bin/wrangler pages project create dc-family-task-manager --production-branch main  # 僅項目不存在時
  ../api/node_modules/.bin/wrangler pages deploy dist --project-name dc-family-task-manager --branch main
  ```
- 驗證三件套：`/api/health` 返回 `environment:"production"`；pages.dev 返回 200；對 API 發 CORS preflight 確認 `access-control-allow-origin` 指向 pages.dev。
- wrangler `^3.99.0` → `4.99.0`（`5b49ed1`），現有 `wrangler.toml` 無需改動。

### 2026-06-11 — Backlog standalone page + UX defaults (frontend-only, no deploy needed)

- 靈感箱從工作台底部抽屜改為獨立頁面 `/backlog`（`features/backlog/BacklogPage.tsx`）；`BacklogDrawer` 已刪除。導航：桌面「工作台／靈感箱／團隊／分類／我的」，手機底部 nav 改 **6 格**（`grid-cols-6`）。Spec/plan 在 `docs/superpowers/specs|plans/2026-06-11-backlog-page*`。
- 日曆上行程條顯示 `標題 · 地點`（`DashboardPage.tsx` `scheduleLabel`）；側欄詳情卡標題與地點分行。先前「有地點只顯示地點」是刻意設計，已按用戶要求改掉。
- 新任務表單預設值（`TaskFormDialog.tsx`）：指派對象 = 登入用戶（`user?.id`）、截止日期 = 今天（`todayISO()`）；編輯既有任務不受影響（`task?.x ?? default` 模式）。

### 2026-06-11 — Task-types redesign: strict review found 11 defects, all fixed (`e79399b`)

- Plans 1–3 (recurring/window/backlog) were "all green" (typecheck + unit tests) yet the core flow was broken in production terms: instances couldn't be completed (stale PATCH guard), instance generation always threw (D1 param limit), and legacy data had no migration. **Lesson: unit tests passing ≠ integration correct — verify cross-layer flows (schema ↔ route ↔ form) end to end.**
- **D1 hard limit: 100 bound parameters per query.** Bulk inserts must chunk — `services/recurrence.ts` uses 8 rows/batch (8 × 12 cols = 96). Drizzle does NOT auto-chunk `.values(array)`.
- Recurring model: template = `taskType:'recurring'` + `parentTaskId:null` + non-null `recurrenceConfig`; instance = `parentTaskId` set + `recurrenceConfig:null`. Any guard/filter touching recurring tasks must distinguish the two (this was the root cause of 3 of the 11 bugs).
- Generation horizon: rolling **90 days** (`HORIZON_DAYS`), topped up by daily cron; `nextOccurrenceAfter` guarantees ≥1 future instance per template (yearly tasks still work). Window start is `today − 1 day` (UTC) to tolerate user-local dates behind UTC.
- Series edit semantics: schedule change (`recurrenceConfig`/`taskType`) → prune pending future instances + regenerate (in_progress/completed preserved); content change (title/description/assignee/category/priority) → direct UPDATE on future non-completed instances. Shared helper: `pruneFutureInstances`.
- Migration `0004_legacy_task_types.sql` converts old `{frequency:...}` configs to the new `mode` shape and `task_type='repeatable'` → `'normal'`. **Must run `db:migrate:remote` before deploying this code**, or legacy recurring tasks silently vanish.
- ~~Known remaining debt~~ (resolved 2026-06-11): `GET /tasks` now supports `from`/`to` (date-overlap semantics; dateless tasks excluded when filtering) + `limit`/`offset` (offset requires limit), all opt-in — no params = old behavior. Date formatters unified in `@ftm/shared` `lib/date.ts` (`formatDateKey` local / `formatDateKeyUTC` for Workers). `getWeekBlockSpans` removed (reuses generic `getWeekSpans`). `idx_team_backlog` dropped in migration `0005` — **run `db:migrate:remote` before next deploy**.
- Collaboration preference: **default to single-threaded work; multi-agent fan-out (review/research swarms) only on explicit request** — token cost of a full 7-finder × 12-verifier review is ~800k subagent tokens.

### 2026-06-08 — Full rebuild tech stack finalized

- Rebuilt from PHP monolith to: **Hono (Workers) + React (Pages) + D1 + KV**, all on Cloudflare.
- Monorepo with pnpm workspaces: `apps/api`, `apps/web`, `packages/shared`.
- Old production data **not migrated** — fresh schema, no backwards-compat burden.
- Detail: `specs/REBUILD_TECH_STACK.md`, full design docs in `specs/rebuild/`.

### Auth design

- Access token: JWT HS256, 15 min, carried in `Authorization: Bearer` header.
- Refresh token: JWT HS256, 30 days, stored in KV as `refresh:{userId}:{jti}`, delivered via HttpOnly cookie.
- Frontend: `accessToken`/`user`/`currentTeamId` persisted to localStorage (key `ftm-auth`); on refresh the app renders immediately and `/auth/me` validates in the background.

### Agent files standardized — 2026-06-09

- Root `CLAUDE.md`, `RULES.md`, and `MEMORY.md` are the canonical agent-facing files.
- `legacy/AGENTS.md`, `legacy/MEMORY.md`, `legacy/RULES.md` are legacy-only and should not be updated.
