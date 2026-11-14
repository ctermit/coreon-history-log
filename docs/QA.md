# Quality and verification — v0.2.0

Green CI and offline tests are necessary but **not proof of end-to-end Figma runtime behavior**.

## Manual evidence reported by the owner (15 Nov 2026)
- [x] Registered Figma Desktop development widget launches.
- [x] v0.1.x popup bug fixed; adding records and opening full history work.
- [x] v0.2.0 core functionality works in Figma Desktop at a basic level.
- [x] About 20 hand-written records in an otherwise empty file show no obvious delay.
- [x] Larger synthetic history in an otherwise empty file showed no obvious slowdown after opening.
- [ ] Record actual timings, file complexity and platform details.
- [ ] Complete usability/visual acceptance — specifically **not yet accepted**.

## Data and upgrade
- [ ] Verify all old v1 product and DS entries appear once in unified history.
- [ ] Verify old IDs, authors, timestamps, text and categories are unchanged after upgrade and rollback.
- [ ] Add/edit Markdown including safe links and lists on canvas and in history.
- [ ] Confirm author and local creation date/time to minutes.
- [ ] Confirm durability after closing and reopening the Figma file and after updating a widget.
- [ ] Test multiple widget copies in one file and a copy of a real project.
- [ ] Test sequential edits by two real designers; verify permissions for view-only users.

## Performance
For 50, 200 and 500+ stored entries, record operating system, Figma version, file complexity, visible N, and approximate timings:
- [ ] Canvas insert/open and reopen without freezing.
- [ ] Add/edit, history search/filter/pagination without dropped inputs.
- [ ] Observe actual node count rendered on canvas, not hidden copies.
- [ ] Verify no missing/duplicate entries after reload.
- [ ] Measure impact in a non-empty, real project; the empty-file test alone is insufficient.

## Release checklist
- PR/main exact SHA and CI success verified.
- No private data, secrets, internal links or unexpected remote/network operations.
- Owner-reviewed UX, migration safety and recovery path.
- Explicit owner authorization before any Figma Community publication.

## Note
v0.2.0 source checkpoint has **18 passing automated tests** (model, widget, HTML UI); these complement, not replace, the manual checklist above.
