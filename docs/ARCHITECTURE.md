# Technical architecture — v0.2.0

## Runtime
Figma Design widget: the registered widget ID in `manifest.json` is stable. Canvas uses the Figma Widget API; a separate HTML iframe opened via `figma.showUI()` provides the full searchable history. The iframe is held open by returning a pending Promise from the click event; CLOSE resolves it.

## Source map
- `widget-src/code.tsx`: inline composer, editing, rendering and iframe messaging.
- `widget-src/model.ts`: history ordering, record schemas, date formatting and limited Markdown parser.
- `ui.html`: full searchable/paginated history and older-record editing; safe DOM elements, no dynamic `innerHTML`.
- `scripts/build.mjs`: transpiles and concatenates TS/TSX to tracked `dist/code.js`.
- `tests/`: model, widget and HTML-history smoke checks.
- `.github/workflows/ci.yml`: TypeScript, tests, build.

## Data invariants
- **Do not change** `useSyncedMap<HistoryRecord>('history-records-v1')`; entries are keyed by record ID.
- Existing `schemaVersion: 1` records retain `mode: product | ds`, timestamp, author, text and category. No migration is required: history ordering simply includes both legacy modes.
- New records use `schemaVersion: 2` without mode. They include ID, kind (`change` or `handoff`), category, text, author ID/name, `createdAt`, `updatedAt`.
- Retain `history-display-limit-v1`; other legacy synced keys may remain but are unused. UI-only draft/editor state has dedicated `*-v2` keys.
- Editing a record preserves its original author, creation timestamp and legacy fields. «Передано» is a distinct record kind, not a category.
- All data belongs to **one widget instance** in its Figma file, not a cross-file database.

## Rendering and formatting
- Enumerate/sort records for the timeline; render only latest N (3, 5, 10 or 15) on canvas. Up to 18 Markdown lines per canvas note, with complete text in history.
- The iframe receives the full snapshot and paginates locally (40 records/page); this is not server-side paging.
- Markdown source is stored as plain text. The canvas uses Figma Text/Span; the iframe uses safely constructed DOM. Only HTTP(S) URLs are links.
- Every full re-render still enumerates the synced map: real-world 50/200/500+ performance and multi-user stability must be measured before publication.

## Current limitations
- Editable drafts are also synced state and can conflict under simultaneous concurrent editing.
- An inline Figma Input commits on text-edit end, creating a two-step save flow; UX refinement is planned.
- Real complex files, multi-user changes, widget updates/recovery and browser runtime are not fully validated.
- No automatic backup/export, backend, telemetry, or network access.
