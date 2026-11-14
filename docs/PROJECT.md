# Coreon History Log — product decisions

**Status:** technical prototype v0.1.0; GitHub CI passed; manual Figma runtime QA **not yet done**.
**Last decision update:** 2026-11-14. This document supersedes outdated status lines in the original research conversation.

## Purpose
Record **meaningful design changes** for other designers to read. Technical version history alone is not sufficient. We aim for minimal effort, fast reading and a responsive file even with substantial past history.

## Confirmed decisions
- Product: **Coreon History Log**; on-canvas widget may use a shorter «История изменений» heading.
- Repository: personal account `ctermit/coreon-history-log`, **public**; publish generic widget to Figma Community only after QA and explicit owner approval.
- Separate from existing Coreon Figma Plugin and from specific company/customer files, IDs or URLs.
- Prioritize **Figma widget with an extended UI window**. Plugin-only is not the current plan; reassess if Figma runtime tests uncover a blocker.
- No install required for colleagues to see/interact with an already inserted widget (subject to Figma permissions).
- Per-instance synced history in the Figma file; no mandatory external storage or authentication.
- On canvas show only the newest **5** product records or **10** DS records by default; configurable 3 / 5 / 10 / 15. Older items must **not** be rendered as hidden nodes; open them in a separate window.
- Fast add, fast inline editing of visible entries; automatic logged-in author and creation date/time; full history with search in a window.
- Same data engine, different behaviors for **product** and **design system** journals.

## Two distinct workflows
### Product design
- Human-written free-text explanations of significant design changes; long or short notes allowed.
- Task IDs/links may be recorded, but an organization-specific format is not required.
- **No «Передано»** phase. Statuses are optional and not forced.

### Design system: tokens and icons
- Collect changes between developer handoffs.
- Categories currently observed: **Added**, **Changed**, **Fixed**.
- **«Передано»** is a separate milestone closing a batch passed to developers, not a fourth change category.
- Goal later: speed up collection and handoff, including optional structured lists and generated summaries.
- Do not assume `Fixed` or any future category can always be inferred from a technical diff.

## Collaboration and retention
- Multiple designers will work sequentially in most cases; **conflicting simultaneous edits of one record are not a blocking MVP requirement**.
- Preserve records across reopens and releases. Never migrate or delete real history silently.
- Existing FigLog and component journals remain the operational source until a deliberately approved migration.

## Product principles
- On-canvas UI is a quick entry point, not a full database interface.
- No global «created/updated» clutter or always-visible delete buttons by default.
- Keep controls and status labels minimal; follow design-system examples without copying private content.
- Users must confirm meaning of any automatically proposed change summary.

## Open decisions (do not invent answers)
- Permissions to edit someone else's record; edit audit trail; deletion and recovery behavior.
- Exact DS record/group layout and list input; handling links to tasks/frames.
- Handoff implementation details, filtering, exports and archiving.
- Long-history storage strategy after empirical Figma load testing.
- Legacy FigLog/component journal migration, public license, branding assets and publication account/widget ID.
