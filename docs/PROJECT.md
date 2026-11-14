# Coreon History Log — product decisions

**Status:** v0.2.0 checked into GitHub as a development baseline. Initial hands-on Figma Desktop tests confirmed core flows; UX and visual polish are still needed. **Not published to Figma Community.**
**Decision update:** 2026-11-15.

## Purpose
A small, shared, human-written design change log visible inside Figma. Low-friction writing and reading matter more than tracking every technical operation.

## Approved v0.2.0 behavior
- Public generic Figma **Design** widget; no private company, project or client identifiers and no mandatory backend.
- **One widget instance = one unified chronological history.** No product-vs-design-system mode switch. Multiple widget instances/files do not merge histories.
- Visible-on-canvas limit: **3 / 5 / 10 / 15**, default 5. Only the newest N are rendered; older records remain in the shared map and appear in the full-history window.
- **Inline add and edit** on the canvas. The HTML window is for full history, search and edits of older records; it shows 40 records per page.
- Optional categories **Added / Changed / Fixed**; Changed is the default, and its label may be omitted on canvas. **«Передано»** is a distinct handoff event, independent of categories and available for any log.
- Automatically record author, creation date and **local time to minutes**; edits preserve original author and creation time.
- Limited Markdown in records: **bold**, safe HTTP(S) links including bare URLs, bulleted and numbered lists. Store the source text, not HTML. An expandable syntax help is available in add and edit.
- Preserve **all existing v0.1.x records**, including their legacy `mode` and `schemaVersion: 1`, in the unchanged synced map. Show both former modes together in the new timeline; new records use `schemaVersion: 2`.
- No automatic tracking of frame changes, AI summaries, analytics, remote requests or account authentication in this release.

## Collaboration and retention
- Sequential editing by multiple designers is the primary collaboration scenario; simultaneous same-record editing is not required for the initial release.
- Never delete, rewrite or migrate existing history silently. Keep existing FigLog/component logs until a separately approved switch.
- No network requests are needed for current features.

## Current quality status and release strategy
- User confirmed rendering, adding records and history opening in Figma Desktop. Approx. 20 handwritten records and a larger synthetic history in an otherwise empty file showed no obvious slowdown; no benchmark timings or results for real complex files were recorded.
- v0.2.0 is a **functional baseline, not a usability acceptance**. Many small UX and visual adjustments are planned.
- Public Figma Community publication is a near-term goal **after a cohesive UX pass, persistence/update compatibility checks and owner approval**, not after every aesthetic detail is polished.
- Initial source/build tests passing do not replace Figma runtime QA.

## Open decisions
- Granular editing permissions, history of edits, deletion and recovery.
- Multi-designer and real-project performance; cross-version update and rollback.
- Public license, widget artwork, Community description and support contact.
- Rich-editor shortcuts beyond documented Markdown and possible future automatic summaries.
