# Competitor research and product hypotheses

Research gathered 2026-11-14. External product claims are **not equivalent to hands-on QA**. See [project decisions](PROJECT.md) for approved requirements and [roadmap](ROADMAP.md) for priorities. No private screenshots or internal task identifiers are replicated here.

| Product | Relevant design pattern | Source |
| --- | --- | --- |
| FigLog | Shared author/date metadata, edit links, full history; expensive all-record render/update patterns in available source | https://github.com/ryansrofe/FigLog |
| Advanced Changelog | In-canvas design log, display configuration, related links | https://www.figma.com/community/widget/1142539867133322876 |
| Simple Changelog | Small entry, labels/categories, date, compact output | https://www.figma.com/community/widget/1201356240213567483/simple-changelog |
| Design Log | Optional images, links, versions, types and more elaborate metadata | https://www.youtube.com/watch?v=GMMxav959XI |
| Design Trail | Snapshots and structural diff of changed Figma frames/layers | https://github.com/alavesa/changelog |
| Change Log Tracker | Developer-described selected-frame change tracking; independently unverified | https://www.linkedin.com/posts/medoisma3il_figma-uxdesign-designops-activity-7325434208246513664-pJYW |
| Design Recap | Generated summary of design activity, described by developer; needs hands-on verification | https://www.figma.com/community/plugin/1602120336688835924/design-recap-generated-changelogs-weekly-reports-status-updates |
| Delta — Changelog Generator | Token/style diff: Added / Changed / Removed; close to DS workflow, but not identical | https://skdas.me/delta |
| Figma AI Design Changelog Generator | AI-assisted description proposal based on design context | https://www.figma.com/solutions/ai-design-changelog-generator/ |

## Static audit of FigLog (source-level only)
- `changeLogs.entries().sort(...).map(...)` creates UI rows for the entire history, not only newest entries.
- `updateOtherStates()` mutates other records when opening/adding a record.
- Editing UI state is stored with synchronized record state, adding writes to shared data.
- These are **plausible** causes of slowdowns, not established profiling results.

## Hypotheses worth testing
- Small canvas surface + long history in UI window improves interaction.
- Automatic author/date saves recurring manual work.
- For design systems, grouped lists and «Передано» batch milestone are more useful than a generic free-text-only log.
- Snapshot/diff can prefill a *draft*, but technical changes cannot reliably explain designer intent.
- Figma widget/plugin events cannot be treated as a guaranteed always-on user-attributed audit stream; any background tracking needs independent technical/privacy review.

## Evidence quality
Features above come from public code or published descriptions. Competitor load times, current pricing, permissions and long-history behavior were not systematically benchmarked. Revalidate before adopting a feature.
