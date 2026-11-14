# Roadmap

A living plan, not a promise of a release date. Order may change after testing.

## Milestone 0 — Foundation (in progress)
- [x] Product name, public personal GitHub repository, two workflow concepts, hybrid widget/UI candidate.
- [x] Source prototype v0.1.0 and basic GitHub Actions check on main.
- [x] Repo-facing decisions, architecture, research, agent instructions and QA plan.
- [ ] Repository ruleset/branch protection set by owner in GitHub UI.
- [ ] Figma assigns development widget ID; preserve it for subsequent releases.
- [ ] Hands-on testing in Figma Desktop and (if feasible) browser.

**Gate:** widget can be inserted, edited, reopened and retain history; no severe runtime regressions.

## Milestone 1 — Reliable fast journal MVP
- [ ] Validate fast add, inline edit, automatic author/date/time and full-history window.
- [ ] Verify 3/5/10/15 visible limits; no rendering of older records.
- [ ] Fix any actual runtime failures and test 50/200/500 stored entries for load, add, edit and reopen.
- [ ] Validate sequential editing by different designers and exact behavior on widget upgrade.
- [ ] Resolve delete/undo policy, user-facing errors and empty states.
- [ ] Record test results and decide if a new storage or archive strategy is necessary.

**Gate:** owner accepts Figma runtime UX and measured performance; existing journals stay untouched until then.

## Milestone 2 — Design-system workflow
- [ ] Confirm Added/Changed/Fixed layout using supplied DS reference examples (no private screenshots in public repo).
- [ ] Improve grouped list entry for icon/token names.
- [ ] Implement and validate «Передано» as a batch-closing milestone **only for DS mode**.
- [ ] Check handoff history, batch boundaries and manual edit behavior.
- [ ] Define simple link-to-frame/task workflow without organization-specific IDs.

## Milestone 3 — Public beta
- [ ] Security/privacy/code audit, Figma manifest review, update/version migration tests.
- [ ] Accessibility/usability and performance checks in Figma Desktop/browser.
- [ ] Choose public license and branding; write public-facing description/instructions.
- [ ] Publish with owner approval; no automatic publishing from CI.

## Independent future research — automation
1. Author/date and optional frame selection: present in manual flow or evaluate small improvements.
2. Snapshot comparison for DS icons/tokens and product frames; draft only, user confirms.
3. Natural-language summaries / AI exploration after utility/privacy review.
4. Background event monitoring only if external service/webhook costs and privacy are justified.

**Out of scope for MVP:** silent background tracking, AI service, universal cross-file history, legacy migration, enterprise permissions, extensive simultaneous-conflict resolution.
