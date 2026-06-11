# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace deps
pnpm install

# Development
pnpm dev:api                # API on :8787 (wrangler dev)
pnpm dev:web:prod           # Web on :5173, hitting production API

# Type checking
pnpm typecheck              # All packages

# Web tests
pnpm --filter @ftm/web test         # Run once
pnpm --filter @ftm/web test:watch   # Watch mode

# Database (D1 via Drizzle)
pnpm db:generate            # Generate migration from schema changes
pnpm db:migrate:local       # Apply to local D1
pnpm db:migrate:remote      # Apply to production D1

# Deploy
pnpm --filter @ftm/api deploy   # Deploy API to Cloudflare Workers
pnpm build                      # Build all packages (dry-run for API)

# Health check
curl http://localhost:8787/api/health
```

## Architecture

**Monorepo structure (pnpm workspaces):**
- `apps/api` — Hono backend → Cloudflare Workers (`@ftm/api`)
- `apps/web` — React + Vite frontend → Cloudflare Pages (`@ftm/web`)
- `packages/shared` — shared Zod schemas, TypeScript types, and enum constants (`@ftm/shared`)
- `legacy/` — archived PHP predecessor (ignore for new work)

**API (`apps/api`):**
- Entry: `src/index.ts` exports `fetch` handler + `scheduled` handler (cron)
- App wiring: `src/app.ts` — Hono instance, CORS, routes mounted at `/api/*`
- Auth: JWT access token (15 min, `Authorization: Bearer`) + refresh token in KV (30 days, HttpOnly cookie). Middleware in `src/middleware/auth.ts` injects `userId`; `src/middleware/team.ts` injects `teamId` + `memberRole` from `X-Team-Id` header.
- Database: Drizzle ORM over D1 (SQLite). Schema in `src/db/schema.ts`. Migrations in `src/db/migrations/`. Client via `src/db/client.ts`.
- Secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET` in `apps/api/.dev.vars` for local dev (gitignored). `RESEND_API_KEY`/`MAIL_FROM` optional for email.
- Response shape: always `{ success: true, data }` or `{ success: false, error: { code, message } }` via `src/lib/response.ts`.
- Cron: `wrangler.toml` schedules daily at 01:00 UTC → `src/services/reminder.ts`.

**Web (`apps/web`):**
- Auth state: Zustand store (`src/stores/auth-store.ts`) — `accessToken`/`user`/`currentTeamId` persisted to localStorage (key `ftm-auth`). On refresh with a persisted token the app renders immediately and `/auth/me` validates in the background (`src/app/useBootstrapAuth.ts`). On 401, `src/lib/api-client.ts` silently refreshes once before clearing auth.
- API calls: `src/lib/api-client.ts` — `request<T>(path, options)` auto-attaches `Authorization` and `X-Team-Id` headers from auth store.
- Data fetching: TanStack Query. Each feature folder has `api.ts` (raw fetch functions) + `hooks.ts` (React Query wrappers).
- Routing: `src/app/router.tsx` — `ProtectedRoute` wraps all authenticated pages; `AppLayout` wraps the shell.
- Feature folders under `src/features/`: `auth`, `tasks`, `categories`, `teams`, `notifications`, `profile`, `schedule-blocks`, `calendar`, `dashboard`.
- UI: shadcn/ui components in `src/components/ui/`. Tailwind CSS v4.
- Tests: Vitest + Testing Library + MSW (mock service worker). `src/test/msw-server.ts` sets up MSW. Each feature has co-located `*.test.tsx`/`*.test.ts`.

**Shared (`packages/shared`):**
- Source is TypeScript, consumed directly (no build step). Path alias `@ftm/shared` resolves to `packages/shared/src/index.ts`.
- Contains: Zod schemas for API inputs, TypeScript types, enum constants (`TASK_STATUS`, `TASK_PRIORITY`, `TASK_TYPE`, `TEAM_ROLE`, etc.), `ApiResponse<T>` wrapper type.

## Key Patterns

- **Route scoping**: public routes → `authMiddleware` only → `authMiddleware + teamMiddleware`. Team-scoped routes require `X-Team-Id` header.
- **Schema-first**: Zod schemas in `@ftm/shared` are the source of truth for both API validation (`@hono/zod-validator`) and frontend form validation (`react-hook-form` + `@hookform/resolvers`).
- **New DB column**: edit `src/db/schema.ts` → run `pnpm db:generate` → `pnpm db:migrate:local` to test locally.
- **New API route**: add file in `src/routes/`, export a `Hono` instance, mount in `src/app.ts`.
- **New frontend feature**: create `src/features/<name>/api.ts`, `hooks.ts`, and page component(s).
