# 0.2.1 — UX interactions review candidate

Status: implemented and covered by local tests; Figma Desktop manual acceptance pending. Public Community publication is not authorized.

| Decision | Implementation | Manual QA |
| --- | --- | --- |
| UX-06 | Minimal on-canvas Figma `Input` with no extra container/card/border/padding | Check native inner editor contrast and keyboard ergonomics |
| UX-07 | No new «Передано» creation action | Existing legacy handoff events remain visible |
| UX-08 | Create/edit on `Input.onTextEditEnd`, no on-canvas Save; full-history editor saves on blur | Mouse click, Escape, repeated blur, keyboard Tab, cancel |
| UX-09 | Persistent «+ Добавить» instead of «Закрыть» | Click while composer is already expanded |
| UX-10 | Category selection from hovered record header; existing Added/Fixed labels clickable | **Prototype**: confirm hover opacity and click target in Figma; decide whether to keep after review |
| UX-11 | Native tooltip on `?` glyph with Markdown reference | Check whether Figma renders newlines; fallback to concise tooltip if not |
| UX-12 | Delete from full-history edit screen with explicit custom confirmation | Test deletion of newest and old records, cancellation, saved data after reopen |

## Safety invariants

- `history-records-v1` retained, schema v1 and v2 entries both readable without migration.
- No backend/network, no telemetry, no Figma release or automatic publishing.
- Only one selected history ID is deleted, after an explicit confirmation.
- Blank/new or unchanged/edit writes do not create/remove data. Source data remains unchanged on cancel.
- Preserve existing registered manifest widget ID and `ui.html` integration.
- Feature-level offline tests and green CI are required; they do not substitute for Figma interaction testing.

## Known interaction limitations

The Widget API provides `onTextEditEnd` (blur) rather than per-keystroke events; the native editor is not controllable from code. `hoverStyle` can only alter fill/stroke/opacity, so the category affordance is an opacity reveal with a click menu. Both are intentional lightweight implementations for the first UX pass.

## Release decision

Keep the 0.2.1 PR open until owner's manual Figma UX check. Once approved, merge and verify `main` CI. A public Figma Community upload remains a separate owner decision after additional UX and compatibility QA.

## Current candidate — owner acceptance adjustments (15 Nov 2026)

- UX-13: Coreon DS `helpCircleLine` SVG, single help tooltip in widget header; remove per-input icons and new-entry label.
- UX-14: date/time has no comma; `JetBrains Mono` 11 px on canvas and a JetBrains Mono / Roboto Mono / monospace stack in history HTML.
- UX-15: retain variant A uniform editing: native Input for new entry always gray (#F4F5F7); existing entries render Markdown and hyperlinks until user clicks the entry body (or pencil). A gray Input opens for that record, returning to normal on blur. `hoverStyle` reveals the pencil when the entire row is hovered. Native link click precedence over parent click still requires live Figma QA.

Owner visual review and link-click integration check are release gates.
