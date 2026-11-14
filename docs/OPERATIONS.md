# Repository operations and release procedure

## Current state
Public personal GitHub repository; `main` is the source branch. At documentation setup, CI passed on the initial prototype. `main` was **not protected** and must be configured by owner in GitHub settings.

## Low-noise development
1. Make a cohesive feature/fix in one branch and one PR.
2. Keep Actions scope to the existing `Verify` workflow: read-only `GITHUB_TOKEN`, TypeScript, tests and build. No scheduled jobs, automatic releases, uploads or AI loops.
3. PR CI and main-merge CI are intentional checks of different commits; don't run workflows for each micro-change.
4. Confirm CI and scope before merge. No need for independent external agent on every documentation/typography change; consider a focused Codex review for substantial code/security changes.
5. After merge, inspect the main CI result. Report any skipped verification explicitly.

## Manual GitHub settings recommended (owner action)
Because the current connector cannot modify repository admin/security settings, configure in GitHub UI:
- **Settings → Rules → Rulesets** (or Branches → Branch protection): apply to `main`, require a pull request before merge, and require passing `Verify / check` status. **Do not require a second review approval** until there are other reviewers, to avoid blocking a personal repository.
- Enable prevention of force pushes and deletions.
- **Settings → Security / Code security**: enable secret scanning/push protection where available on this account; review Dependabot alerts if offered.
- **Settings → Actions → General**: prefer default `GITHUB_TOKEN` read permissions and restrict external workflows/actions to trusted sources; forked PRs must not receive secrets or write permissions.
- Consider disabling unused GitHub features only if you actually want them off. Maintain Issues to collect tester feedback.
- Repo description suggestion: “A lightweight Figma widget for design change history — fast notes, shared context and design-system handoffs.”

Do not treat these as already applied until verified.

## Figma development and release
- Figma Desktop registered the widget as `1703534862855031560`. The manifest includes this ID; preserve it in all future builds and verify updates against the same registered widget.
- Build with `npm run check`; manual Desktop/browser validation per [QA](QA.md).
- Publish to Community **only with owner approval**, after selecting license, artwork, support contact and a migration/recovery plan.
- Keep existing FigLog and component logs until manual verification and an intentional transition.
- Never upload personal/corporate design artifacts to public issues, PRs or CI artifacts.

## Dependency policy
The prototype has three TypeScript/typings dev dependencies. No automatic dependency-upgrade PR bot is enabled initially to avoid unwanted PR/CI noise. Review dependencies deliberately when actively working on a release. A lockfile and `npm ci` are desirable follow-ups, but registry access and reproducible lock generation must be verified before changing CI.
