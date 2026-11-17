# Design History Log — local test installation (0.2.3)

The **0.2.2** version is published in Figma Community. This document describes the **development-only 0.2.3** test build.

## Download and install on another computer

1. Download the `design-history-log-test-<SHA>` artifact from the PR's **Verify** run and extract `Design-History-Log-v0.2.3-test.zip`.
2. Check that `manifest.json`, `dist/code.js` and `ui.html` are present in the original directory structure.
3. Figma Desktop → Widgets → Development → **Import widget from manifest**, then select `manifest.json`.
4. Use a copy of the test Figma file for destructive checks; keep Community instances unchanged.

## Updating an existing development installation

Back up its local directory. Replace only `dist/code.js` and `ui.html`; **do not overwrite the installed manifest**. The Widget ID must remain `1703534862855031560`.

## Manual verification

- Add and edit a record on canvas; confirm changes survive file reopen.
- Search full history and navigate to its last page.
- Delete an old/legacy record via list action → overlay **«Удалить запись?»** → **«Удалить»**.
- Cancel another deletion; confirm the record remains.
- Confirm no unrelated records disappear, including in the 530-record test file.
- Check category changes, Markdown links and the help tooltip.

No production/Community publication is performed by this workflow.
