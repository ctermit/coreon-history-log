# Design History Log — 0.2.3 development

A lightweight Figma Design widget for a shared chronological design change log. Version **0.2.2** is [published in Figma Community](https://www.figma.com/community/widget/1703534862855031560/design-history-log). Version **0.2.3** is a development build, not yet published.

## Current functionality

- Permanent gray (`#F4F5F7`, radius 6) `Input` for adding a record, activated with one click.
- Existing records render formatted Markdown and clickable HTTP(S) links by default. The **entire entry text area** now activates a gray edit `Input` when clicked, not only the pencil. Pencil appears on hover over that area; Figma native editor may need an extra click to place the text cursor.
- No redundant «Новая запись» heading, separate Save, Close, handoff-creation or on-canvas edit buttons.
- A single tooltip icon in the header uses the exact Coreon DS `helpCircleLine` vector asset. No duplicate help icons beside text fields.
- Date style `JetBrains Mono` 11 px on canvas, with `JetBrains Mono`, `Roboto Mono`, monospace stack in the history HTML window; display `15.11.2026 22:19` without a comma.
- Category can be changed after creation from the compact on-canvas category chooser; `Changed` remains default.
- The full-history list supports deletion of a selected entry with a compact translucent overlay confirmation; the editor still saves on blur.
- Empty new text and blank/unchanged edits do not overwrite history; existing old `Передано` records and schema v1/2 remain intact.

**Manual QA gate**: Figma-native `Span.href` navigation when nested in a clickable entry container must be checked before treating this build as the released stable default. Source-level tests verify safe links are still represented by link spans but do not reproduce Figma native click arbitration.

## Existing functionality

- One history per widget instance, including old product and design-system notes; **no data migration**.
- Display only 3, 5, 10 or 15 newest records on canvas. Search and pagination of the entire history in the iframe.
- Optional categories with `Changed` as the default; independent legacy «Передано» entries remain visible.
- Author, date and local time to minutes, with original creation metadata retained after editing.
- Small Markdown subset: **bold**, safe HTTP(S) links including bare URLs, bulleted and numbered lists.
- Storage: `history-records-v1` and all existing schema v1/v2 records; widget ID from the existing Figma registration remains unchanged.
- No external API, backend, telemetry or network access.

## Install a 0.2.3 test build

The GitHub **Verify** workflow for this PR provides a downloadable artifact named
`design-history-log-test-<SHA>`, which contains `Design-History-Log-v0.2.3-test.zip`.
Extract the ZIP without changing its directory structure. It contains
`manifest.json`, `dist/code.js` and `ui.html`.

1. **New computer:** In Figma Desktop choose Widgets → Development → Import widget from manifest, then select the extracted `manifest.json`.
2. **Existing development widget:** Back up its local folder, replace only `dist/code.js` and `ui.html`. Keep the installed registered `manifest.json`.
3. Test add/edit, Markdown links, search, deleting an older record, cancellation, and persistence after reopening the file.

Figma Widget ID remains `1703534862855031560`. The test build must not be used to update Community without owner approval.

For local verification with installed dependencies, run `npm run check` (TypeScript, tests, build and ZIP). Run `npm run package:test` to package an existing build.

### Runtime limitations / acceptance

Figma widgets' on-canvas `Input` shows Figma's native text editor; we cannot restyle that internal editor. `onTextEditEnd` fires when the input loses focus, not on each keystroke. Native hover styling supports opacity/color overrides only. Confirm the exact focus, Escape, mouse and keyboard behaviors in Figma Desktop. The view's conceptual UX is approved; **runtime hover/autosave and visual acceptance are still pending**.

The 0.2.3 development build does not automatically publish or update Figma Community.

## Experimental FigLog migration (not in Community)

The isolated branch `experiment/figlog-migration` adds a **test-only** import action in the full history window. It reads a **detached (Copy as layers) FigLog frame in the same Figma file** using its node ID. Enter the frame URL or node ID, inspect the preview, then explicitly import into a **duplicate test file**. The original frame is never modified; no network is used.

- Preserves visible text, author, creation time, optional edited time, supported Added/Changed/Fixed categories.
- Drops empty drafts; skips ambiguous entries, unsupported types and entries with links whose target URLs are not present in the detached layers, rather than silently losing their data.
- Original time-zone metadata is unavailable in detached layers; dates are interpreted as Figma's local time and original labels retained for audit. Confirm results before using a different time zone.
- Uses deterministic source-frame/source-row IDs so repeat imports skip existing entries, including edited imported records.
- The importer is experimental and must not be merged into stable `main` or published until owner-approved after real file testing.

For this experiment, the checked-in `dist/code.js` is intentionally the **frozen 0.2.3** bundle. Always install from the **CI-built test ZIP** for PR #9, not from raw files in this branch. On standard production PRs, CI continues to enforce exact generated-bundle synchronization.

**Current experiment safety limit:** up to 50 imported entries per confirmation; larger FigLogs may be previewed but require a separately reviewed chunked-import implementation before any writes.
