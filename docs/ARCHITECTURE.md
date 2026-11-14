# Technical architecture (v0.1.0 prototype)

## Why a widget
A Figma widget is visible on the canvas and its synchronized state is shared by collaborators editing the same file/widget instance. The widget can open a richer `figma.showUI()` window without a separately installed plugin.

## Source map
- `manifest.json`: Figma widget manifest (development ID is not assigned yet).
- `widget-src/code.tsx`: on-canvas interface, Figma events and synced storage.
- `widget-src/model.ts`: pure validation, ordering and record semantics.
- `ui.html`: add and full-history window.
- `scripts/build.mjs`, `dist/code.js`: self-contained build output.
- `tests/`: unit/model and widget smoke tests; Figma runtime still needs human verification.
- `.github/workflows/ci.yml`: TypeScript, tests, build.

## State contract
- `useSyncedMap<HistoryRecord>('history-records-v1')`: entries keyed by ID.
- `useSyncedState('history-mode-v1', 'product')`
- `useSyncedState('history-display-limit-v1', 5)`
- `HistoryRecord.schemaVersion = 1`
- Record fields: ID, mode, kind (`change`/`handoff`), DS category, text, author ID and name, `createdAt`, `updatedAt`.
- Creation uses `figma.currentUser` and `Date.now()`. Editing preserves original author and creation time.
- DS handoff is a kind of record, allowed only in DS mode.
- Stored content is **per widget instance**, not automatically shared between files or other widget copies.

## Render and performance
All records are currently enumerated and sorted to pick the latest N; **only N entries are rendered on canvas**. The UI window presents history in pages. Hidden older records aren't represented by invisible Figma nodes.

This cuts scene complexity but does *not* eliminate full-map enumeration/synchronization costs. Verify actual Figma behavior with 50/200/500+ records. Consider partitioned indexes, paging or archives **only after measurement**. Do not casually change synced keys/data format.

## Privacy and security
No backend, network calls, telemetry, customer data or credentials in the prototype. `manifest.json` denies remote domains. Public repository may include only synthetic fixtures and generic code.
Never put real logs, screenshot samples, private issue IDs, tokens or internal file links into commits or public PR descriptions.

## Known prototype limitations
- In Figma, runtime interaction and update behavior are not independently validated.
- Some button/edit behaviors and accessibility need hands-on testing.
- No production migration path or persistent off-widget backup/export.
- Sequential multi-designer use expected; conflicting simultaneous edits are secondary.
- Widget development/publishing will assign an ID; ensure it stays unchanged after registration.
