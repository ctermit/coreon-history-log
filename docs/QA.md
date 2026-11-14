# Quality and verification plan

Use this checklist for Figma runtime QA; checkboxes are deliberately open until tested. An offline unit test or green CI is **not** a substitute for human testing in Figma.

## Baseline
- [ ] Load development widget in Figma Desktop from `manifest.json`.
- [ ] Open in browser editor if supported and compare behavior.
- [ ] Add a product record: user and date/time auto-populate correctly.
- [ ] Inline-edit a visible record; unchanged author and original date; new update timestamp.
- [ ] Add / edit a DS record under each category Added / Changed / Fixed.
- [ ] Insert a DS-only «Передано» milestone; ensure product mode cannot create it.
- [ ] Change widget mode and limit (3/5/10/15); check defaults and mode separation.
- [ ] Create a long/multi-line entry and edit it twice.
- [ ] Open full-history window, search, edit an older entry and navigate pages.
- [ ] Close/reopen UI and file; confirm no missing or duplicate records.
- [ ] Sequential editing from two designer accounts; verify propagation to second user.
- [ ] Check behavior in view-only permissions (readability vs interaction).

## Performance at 50 / 200 / 500+ stored records
For each volume, record file complexity, OS, Figma version, mode, visible limit and approximate measurements:
- [ ] Insert/open widget without UI freezing.
- [ ] Switch mode and visible limit without UI freezing.
- [ ] Add/edit on canvas and in history window without lost input.
- [ ] Search, paginate and close the full-history UI.
- [ ] Reopen Figma file; verify durability and count.
- [ ] Inspect how many record nodes render on canvas (must not equal all historical records).

Capture timings/observations in PR or issue without private screenshots or user data. Never invent benchmark numbers.

## Data safety and upgrade
- [ ] Create records in old development build; update widget; confirm persistence and unchanged IDs/authors/creation time.
- [ ] Check invalid/empty entries and long text.
- [ ] Check fast repeated add; no accidental duplicates.
- [ ] Confirm default mode/limit for fresh widget.
- [ ] Verify multiple copies in one file do not unexpectedly share data.
- [ ] Test large history back-up/export strategy before production migration.

## Release gate
- Exact code revision and relevant CI run identified.
- `npm run check` passes in CI.
- No client/internal artifacts, credentials, fixed Figma file IDs or unexpected network requests.
- Manual Figma QA with findings documented.
- Owner explicitly approves public publication; no automated deployment.
