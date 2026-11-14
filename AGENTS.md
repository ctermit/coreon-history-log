# Coreon History Log — agent instructions

This file is the stable context for Codex and other coding agents. Read it **before editing** the repository.

## Source of truth
1. [Project decisions](docs/PROJECT.md) — approved scope and UX rules.
2. [Roadmap](docs/ROADMAP.md) — priorities and upcoming stages.
3. [Architecture](docs/ARCHITECTURE.md) — data and implementation invariants.
4. [QA](docs/QA.md) — acceptance criteria and risk checks.
5. [Operations](docs/OPERATIONS.md) — CI, review and release procedure.
6. [Research](docs/RESEARCH.md) — references, not requirements.

If a document conflicts with the code, report the discrepancy; don't silently rewrite product decisions.

## Product
Public, generic Figma widget, not a Coreon-only internal integration.
Two journal modes: **product** (free-text change notes, no handoff), **DS** (Added / Changed / Fixed and a separate `Передано` milestone).
On-canvas display: default 5 product or 10 DS records, configurable 3/5/10/15. Render *only* the visible records. Add and edit quickly. Open full searchable history in the widget UI.
Creator and timestamps are automatic; edits must preserve original author and creation time. Data stays in the Figma file/widget instance without a mandatory server.
Simultaneous editing of the same record is low priority; reliable sequential editing and preservation of existing data are required.

## Engineering rules
- Preserve synced storage keys (`history-records-v1`, `history-mode-v1`, `history-display-limit-v1`) and `schemaVersion`; any changes require an explicit migration plan, tests and owner approval.
- Keep the assigned Figma widget ID stable once registered. Never invent one or overwrite the real ID.
- No hard-coded team IDs, file IDs, internal URLs, private examples, tokens, credentials or client design data.
- Keep network access disabled unless a specific feature, threat analysis and owner approval require it.
- Don't introduce background tracking, AI calls, server dependencies, analytics or telemetry without an explicit decision.
- Do not automatically publish to Figma Community, deploy, or replace existing FigLog/component journals.
- Avoid mass state updates and invisible render nodes. Optimize for 50/200/500+ stored records; offline tests are not proof of Figma runtime performance.
- Keep user-facing text short and clear; Russian interface copy should use «ёлочки», without unnecessary terminal periods.

## Development and QA
- Prefer one cohesive PR per independent milestone, not many micro-PRs. Minimize redundant Actions runs.
- Run `npm run check` when dependencies are available; CI is the authoritative remote check. Do not claim manual Figma testing without doing it.
- For code changes, cover storage invariants, visible-record count, author/date preservation and DS handoff restrictions.
- External contributors' workflow code is untrusted: never expose secrets to PR builds or use privileged `pull_request_target` with checkout.
- Avoid unnecessary third-party agents/automatic PR creators. `AGENTS.md` guides agents when invoked; it does not run an agent.
- A human owner decides when to merge, release and publish; summarize tested vs. untested aspects.
