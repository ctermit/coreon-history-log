# Coreon History Log — 0.2.1 UX preview

Development preview of a lightweight Figma Design widget for a shared chronological design change log. **Not published in Figma Community.**

## UX improvements in 0.2.1

- **UX-06:** simpler Figma `Input` in the on-canvas composer and editor; no additional outer frame or padding.
- **UX-07:** remove the «Передано» creation button. Existing handoff records remain intact and visible.
- **UX-08:** automatically save a new record or a text edit on `onTextEditEnd` (exit from Figma's editor); no separate canvas Save button. Blank new text does not create a record. Unchanged/blank edits do not overwrite records.
- **UX-09:** the header action always reads «+ Добавить»; there is no replacement «Закрыть» button.
- **UX-10, experimental:** category changed after creation via a subtle header hover action and compact `Changed / Added / Fixed` chooser. This needs real Figma Desktop hover testing before acceptance.
- **UX-11:** a `?` icon provides Figma-native Markdown syntax tooltip next to the canvas composer and editor; the history editor uses native HTML `title`.
- **UX-12:** delete a record from the full-history editor after an explicit confirmation; only the selected entry is deleted.

The full-history HTML editor also saves nonblank changed text on blur and offers explicit **Отмена** to abandon editing. It suppresses blur-saving when Delete or Cancel is activated by pointer input. Verify its actual keyboard/focus handling during Figma QA.

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
3. Replace only `dist/code.js` and `ui.html` with the files from this archive. **Do not overwrite `manifest.json`.**
4. Reinsert/refresh the widget or restart Figma Desktop if necessary.
5. Check adding without Save, category hover, tooltip, editing, delete confirmation, and persistence after reopen.

For local verification with installed dependencies: `npm run check` (TypeScript, tests and bundle).

### Runtime limitations / acceptance

Figma widgets' on-canvas `Input` shows Figma's native text editor; we cannot restyle that internal editor. `onTextEditEnd` fires when the input loses focus, not on each keystroke. Native hover styling supports opacity/color overrides only. Confirm the exact focus, Escape, mouse and keyboard behaviors in Figma Desktop. The view's conceptual UX is approved; **runtime hover/autosave and visual acceptance are still pending**.

This version is a review candidate; not an automatic Figma Community publication.
