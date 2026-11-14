# Roadmap — Coreon History Log

## Completed checkpoint: 0.2.0 (2026-11-15)
- [x] Public repository and Figma-registered development widget with stable ID.
- [x] Widget launch, creation and full-history opening manually confirmed in Figma Desktop.
- [x] Unified timeline (legacy product and DS records retained), inline add/edit, category selection, handoff event.
- [x] Time to minutes, basic Markdown and formatting help.
- [x] Offline model/widget/UI tests and reproducible bundle; initial 20-entry and large synthetic-history tests in an empty file.
- [ ] Real-world browser, multi-designer and upgrade/persistence regression testing.
- [ ] Resolve evident UX usability and visual issues.

## Next milestone — UX usability and visual refresh
- [ ] Collect and prioritize the owner's specific element-level fixes.
- [ ] Reduce the required steps to add/save/edit a record (especially blur-to-commit).
- [ ] Improve compactness, typography, control hierarchy, error feedback and long-text behavior.
- [ ] Validate clickable links and Markdown formatting in a real Figma file.
- [ ] Preserve existing synced data and unit coverage through the redesign.
- [ ] Review resulting UX in Figma Desktop before marking a new version.

## Next milestone — early public Figma Community publication
- [ ] Review security, privacy, manifest, license, branding and support channel.
- [ ] Test upgrade from existing widget instance, retention and minimal rollback path.
- [ ] Test on a non-empty, complex Figma file and in the browser where supported.
- [ ] Verify sequential collaboration by two editors and view-only access.
- [ ] Publish **only after explicit owner approval**. Continue iterative updates after approval.

## Later / research
- Better design-system batch/handoff UX, export or archive if data volume warrants it.
- Linked frame/task references and optional grouped changes.
- Automatic diff suggestions and AI drafts only after separate opt-in/privacy review.

**Out of scope for v0.2.0:** backend, analytics, automatic frame monitoring, cross-file history, enterprise permissions and silent migration from FigLog.
