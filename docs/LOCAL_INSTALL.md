# Development-widget local update

COREON HISTORY LOG — TEST UPDATE 0.2.1

1. Use a copy of the Figma file. Back up your installed development-widget folder.
2. In Figma Desktop: Widgets → Development → Coreon History Log → Reveal in Finder.
3. Replace only dist/code.js and ui.html from this archive.
4. Keep your existing manifest.json and the registered widget ID unchanged.
5. Reopen the widget or restart Figma Desktop if needed.

TEST IN FIGMA:
• «+ Добавить» opens a single minimal on-canvas Input; no extra buttons «Сохранить», «Передано», «Закрыть».
• Enter text in Figma's built-in editor and click away: one record is created, the input closes.
• Edit a record and exit the editor: text is saved without Save. Blank editing must not erase the record.
• Hover over a record's author/time header. When Changed, «+ Категория» should appear. Click to change to Added or Fixed. Click the badge to change again.
• Hover the ? icon to see Markdown syntax.
• Open «Вся история», edit a record, choose «Удалить запись» → confirm/cancel. Ensure only the selected record disappears after confirmation.
• Reopen the file and check old and new records.

The hover behavior and Figma editor input lifecycle require real manual testing; our automated smoke tests cannot prove them. This is a local review build, not Figma Community publication.
