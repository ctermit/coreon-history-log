# Coreon History Log

**Stage:** v0.1.0 technical prototype. CI green; manual runtime validation in Figma pending. Not published.

## Project documentation

- [Product decisions](docs/PROJECT.md) — current requirements and two journal workflows
- [Roadmap](docs/ROADMAP.md) — ordered milestones and explicit release gates
- [Architecture](docs/ARCHITECTURE.md) — data model, synced keys and performance limitations
- [Quality checklist](docs/QA.md) — real Figma verification and migration tests
- [Research and competitors](docs/RESEARCH.md) — reusable external references
- [Repository operations](docs/OPERATIONS.md) — CI, branch settings, publication
- [Agent instructions](AGENTS.md) — durable context for Codex and coding agents
- [Security policy](SECURITY.md) — public repository precautions

A lightweight, collaborative history widget for Figma Design and FigJam. The source is generic: no organization-specific IDs, endpoints, or design files are embedded.

## What the technical prototype includes

- A compact on-canvas view limited to the most recent **5** product-design records, or **10** design-system records by default; limit is configurable (3 / 5 / 10 / 15).
- One-click **Add** window. The author and date/time are supplied from the current Figma user and the clock.
- **Inline editing** of visible record text on the canvas (click the text to edit; finish editing to save).
- Separate scrollable/searchable history window with **40 records per page**, and editing for older records.
- Two modes: product design (free-text notes) and design system (Added, Changed, Fixed, plus separate **Передано** milestone).
- Data stored per widget instance in Figma's synced widget map; **no backend or token** is required.

## Installation note

A Figma widget ID is intentionally **not set** in this repository. Figma will assign it when the widget is registered/published. Keep that assigned ID in future versions.

## Try locally

1. Install Node.js 22+ and dependencies with `npm install`.
2. Run `npm run check` (TypeScript, unit tests, build).
3. Open Figma Desktop → `Widgets > Development > Import widget from manifest`.
4. Select the local `manifest.json`, then insert **Coreon History Log** from development widgets.
5. Use the widget's property menu to choose the journal mode and the number of on-canvas entries.

## Design and engineering notes

- The widget doesn't create invisible Figma layers for hidden records; it only renders the most recent `N` records.
- `useSyncedMap` persists changes per record rather than rewriting one giant array. A complete list is still enumerated and sorted when rendering: **performance inside Figma must be measured** at 50 / 200 / 500+ records before release. Offline unit tests do **not** demonstrate actual Figma performance.
- Edits preserve original author and creation time; the updated timestamp changes.
- Data is local to each widget instance in its Figma file. Adding the widget to a different file does **not** create a shared cross-file history.
- This prototype does not track edits by other designers automatically, compare frames, import FigLog history, or provide role-based access control.
- This prototype should not replace active FigLog or component-based logs until it has been manually tested in Figma Desktop, including persistence and widget updates.

## Privacy and security

- No network calls, secrets, external services, Figma file IDs, or user-specific configuration.
- Public repository: never commit client designs, actual logs, auth tokens or private URLs.
- External PRs receive only read-only `GITHUB_TOKEN` permissions in CI.

## Next verification

- Confirm actual Figma Widget API typing/build compatibility and runtime rendering in Figma Desktop.
- Exercise inline editing (including multi-line text) and modal update flow.
- Evaluate 50 / 200 / 500 historical entries, and reopening an existing widget.
- Verify new-version migration and sequential edits by multiple designers.
- Refine DS presentation and milestone UX from real workflow examples.
