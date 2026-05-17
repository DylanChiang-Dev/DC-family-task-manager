# 家庭任務管理系統 | Family Task Manager Rules

## Documentation Rules

- Root `AGENTS.md`, `RULES.md`, and `MEMORY.md` are the only standard agent-facing entry files.
- Do not recreate `CLAUDE.md`, `Agent.md`, `Rules.md`, `Memory.md`, or lowercase memory files; migrate useful content into the standard files instead.
- `MEMORY.md` should stay progressive: top policy, current facts, latest entries, then older migrated history.
- Long logs, generated output, and bulky evidence should not be pasted into the root memory; store them as project artifacts and link from memory.

## Git Rules

- Work on the repository main branch unless the user explicitly asks for another branch.
- Keep only the local main branch by default; do not delete remote branches without explicit instruction.
- Check `git status --short` before edits and before final reporting.
- Do not revert user changes unless explicitly asked.

## Safety Rules

- Never commit secrets, tokens, private keys, passwords, `.env` values, or credential dumps.
- Generated files such as `.DS_Store`, `__pycache__`, `.pytest_cache`, dependency folders, and build output should stay untracked unless the project intentionally tracks them.
- Do not add analytics, telemetry, or new network calls unless requested.

## Verification Rules

- Prefer the fastest relevant check for the touched area.
- For Node projects, use existing `build`, `test`, or `lint` scripts when present.
- For Go projects, use `go test ./...` when dependencies are available.
- For Rust projects, prefer `cargo check` before heavier builds.
- For PHP/Composer projects, start with `composer validate`.
