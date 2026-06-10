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

### 2026-06-08 — Full rebuild tech stack finalized

- Rebuilt from PHP monolith to: **Hono (Workers) + React (Pages) + D1 + KV**, all on Cloudflare.
- Monorepo with pnpm workspaces: `apps/api`, `apps/web`, `packages/shared`.
- Old production data **not migrated** — fresh schema, no backwards-compat burden.
- Detail: `specs/REBUILD_TECH_STACK.md`, full design docs in `specs/rebuild/`.

### Auth design

- Access token: JWT HS256, 15 min, carried in `Authorization: Bearer` header.
- Refresh token: JWT HS256, 30 days, stored in KV as `refresh:{userId}:{jti}`, delivered via HttpOnly cookie.
- Frontend: access token lives in Zustand memory only (not persisted); `currentTeamId` persisted to localStorage.

### Agent files standardized — 2026-06-09

- Root `CLAUDE.md`, `RULES.md`, and `MEMORY.md` are the canonical agent-facing files.
- `legacy/AGENTS.md`, `legacy/MEMORY.md`, `legacy/RULES.md` are legacy-only and should not be updated.
