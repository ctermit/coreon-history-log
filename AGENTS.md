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
A public, generic **Figma Design** widget for human-authored design change histories. **One unified timeline per widget instance**, not separate product/DS modes. Fast inline add/edit; full searchable/paginated history in an iframe.
Show only newest 3/5/10/15 on-canvas records, default 5. Optional Added/Changed/Fixed tags (Changed default); separate «Передано» record available to all journals. Show automatic author and date/time to minutes. Store minimal Markdown as text; support bold, safe HTTP(S) links and lists, and provide in-editor formatting help.
Old schema v1 product/DS entries are displayed together without migration or mutation; new entries use schema v2. Preserve author and createdAt on edits. History is stored in the Figma file/widget instance, with no backend. Sequential collaborative editing matters; simultaneous edits of the same draft are secondary.

## Engineering rules
- Preserve the synced records key `history-records-v1`, the display-limit key `history-display-limit-v1`, all v1 record fields, and the owner-registered widget ID. The legacy `history-mode-v1` key is unused in v0.2.0; do not delete/migrate historic data without owner approval. New records use `schemaVersion: 2`.
- Keep the assigned Figma widget ID stable once registered. Never invent one or overwrite the real ID.
- No hard-coded team IDs, file IDs, internal URLs, private examples, tokens, credentials or client design data.
- Keep network access disabled unless a specific feature, threat analysis and owner approval require it.
- Don't introduce background tracking, AI calls, server dependencies, analytics or telemetry without an explicit decision.
- Do not automatically publish to Figma Community, deploy, or replace existing FigLog/component journals.
- Avoid mass state updates and invisible render nodes. Optimize for 50/200/500+ stored records; offline tests are not proof of Figma runtime performance.
- Keep user-facing text short and clear; Russian interface copy should use «ёлочки», without unnecessary terminal periods.

## Development and QA
- Prefer one cohesive PR per independent milestone, not many micro-PRs. Actions on standard GitHub-hosted runners in this public repository do not consume private-repo minutes. Still keep PRs cohesive.
- Run `npm run check` when dependencies are available; CI is the authoritative remote check. Do not claim manual Figma testing without doing it.
- For code changes, cover storage invariants, visible-record count, author/date preservation and unified category/handoff semantics, safe Markdown, and preservation of v1 history.
- External contributors' workflow code is untrusted: never expose secrets to PR builds or use privileged `pull_request_target` with checkout.
- Avoid unnecessary third-party agents/automatic PR creators. `AGENTS.md` guides agents when invoked; it does not run an agent.
- A human owner decides when to merge, release and publish; summarize tested vs. untested aspects.
