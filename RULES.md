# RULES.md — 家庭任務管理系統

## Git

- Work on `main` unless explicitly asked for another branch.
- Check `git status --short` before edits and before final reporting.
- Do not revert user changes unless explicitly asked.
- Keep only the local main branch by default; do not delete remote branches without explicit instruction.

## Safety

- Never commit secrets, tokens, private keys, passwords, `.env` values, or credential dumps.
- `apps/api/.dev.vars` is gitignored — keep it that way; never add it to staging.
- Do not add analytics, telemetry, or new network calls unless requested.

## Verification

- Before reporting a task complete, run the fastest relevant check for the touched area:
  - Changed API code → `pnpm --filter @ftm/api typecheck`
  - Changed web code → `pnpm --filter @ftm/web typecheck && pnpm --filter @ftm/web test`
  - Changed shared schema → `pnpm typecheck` (all packages)
  - Changed DB schema → verify `pnpm db:generate` produces the expected migration
- Before reporting any web auth, API client, deployment, or Cloudflare Pages fix complete, run a production web build and verify the built bundle contains the intended production API base:
  - `pnpm --filter @ftm/web build`
  - `rg "https://ftm-api.dylan-chiang.workers.dev/api" apps/web/dist/assets`
- Do not assume Cloudflare Pages injected `VITE_API_BASE_URL`; verify the generated assets or the live deployed asset.

## Deployment

- After adding a new DB table or column: run `pnpm db:migrate:remote` first, then `pnpm --filter @ftm/api deploy`.
- Never deploy without running the remote migration first — the Worker will 500 if it queries a table that doesn't exist.
- Deploy command (from repo root): `cd apps/api && pnpm deploy`
- For web production deploys, the app must not fall back to same-origin `/api` unless Pages is explicitly configured to proxy `/api` to the Worker. The default/fallback API base must be the production Worker URL.

## Code Style

- Follow the existing pattern in the file being edited; do not introduce new abstractions unless the task requires them.
- API response shape is always `ok(data)` or `fail(code, message)` from `src/lib/response.ts` — do not use bare `c.json()` for route responses.
- New Zod schemas and shared types belong in `packages/shared`, not in `apps/api` or `apps/web`.
- Drizzle column builder helpers (like `timestamps()`) cannot be reused across table definitions — create a fresh call per table.
- If a new route file imports `z` directly from `"zod"`, add `zod` to `apps/api/package.json` dependencies — it is not bundled transitively by wrangler.

## Documentation

- `CLAUDE.md`, `RULES.md`, and `MEMORY.md` at the repository root are the canonical agent-facing entry files.
- Do not create additional agent files (`AGENTS.md`, etc.); migrate useful content into the standard files instead.
- `MEMORY.md` follows the progressive format: current facts at top, newer entries above older ones.
- Legacy docs in `legacy/` are for historical reference only; do not update them.
