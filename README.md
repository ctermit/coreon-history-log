# Coreon History Log — 0.2.1 UX preview

Development preview of a lightweight Figma Design widget for a shared chronological design change log. **Not published in Figma Community.**

## Accepted functionality in 0.2.1

- Permanent gray (`#F4F5F7`, radius 6) `Input` for adding a record, activated with one click.
- Existing records render formatted Markdown and clickable HTTP(S) links by default. The **entire entry text area** now activates a gray edit `Input` when clicked, not only the pencil. Pencil appears on hover over that area; Figma native editor may need an extra click to place the text cursor.
- No redundant «Новая запись» heading, separate Save, Close, handoff-creation or on-canvas edit buttons.
- A single tooltip icon in the header uses the exact Coreon DS `helpCircleLine` vector asset. No duplicate help icons beside text fields.
- Date style `JetBrains Mono` 11 px on canvas, with `JetBrains Mono`, `Roboto Mono`, monospace stack in the history HTML window; display `15.11.2026 22:19` without a comma.
- Category can be changed after creation from the compact on-canvas category chooser; `Changed` remains default.
- Full-history editor supports edit-on-blur and explicit confirmation before deleting one entry.
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

## Installation in existing Figma Desktop development widget

1. Test in a copy of your Figma file and back up the current widget directory.
2. In Widgets → Development, choose **Coreon History Log** → **Reveal in Finder**.
3. Replace `dist/code.js` and `ui.html` with the files from this archive. **Do not overwrite `manifest.json`.**
4. Reinsert/refresh the widget or restart Figma Desktop if necessary.
5. Check adding without Save, category hover, Coreon help icon, full-area click to edit, opening a Markdown link, delete confirmation, and persistence after reopen.

For local verification with installed dependencies: `npm run check` (TypeScript, tests and bundle).

### Runtime limitations / acceptance

Figma widgets' on-canvas `Input` shows Figma's native text editor; we cannot restyle that internal editor. `onTextEditEnd` fires when the input loses focus, not on each keystroke. Native hover styling supports opacity/color overrides only. Confirm the exact focus, Escape, mouse and keyboard behaviors in Figma Desktop. The view's conceptual UX is approved; **runtime hover/autosave and visual acceptance are still pending**.

This version is a review candidate; not an automatic Figma Community publication.
