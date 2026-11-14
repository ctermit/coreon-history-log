/* Generated: do not edit manually */
const MAX_TEXT_LENGTH = 5000;
const LIMIT_OPTIONS = [3, 5, 10, 15];
const MAX_CANVAS_LINES = 18;
function cleanText(value) {
    return value.trim().slice(0, MAX_TEXT_LENGTH);
}
function validateChange(text) {
    return cleanText(text) ? null : 'Добавьте описание изменений';
}
function byNewest(records) {
    return records.sort((a, b) => (b.createdAt - a.createdAt) || b.id.localeCompare(a.id));
}
function recordsForHistory(records) {
    return byNewest(records.slice());
}
function visibleRecords(records, limit) {
    return recordsForHistory(records).slice(0, LIMIT_OPTIONS.includes(limit) ? limit : 5);
}
function effectiveCategory(record) {
    return record.kind === 'handoff' ? null : (record.category || 'changed');
}
function createHistoryRecord(params, author, now, nonce) {
    const isHandoff = params.kind === 'handoff';
    const cleaned = cleanText(params.text);
    if (!isHandoff) {
        const error = validateChange(cleaned);
        if (error)
            throw new Error(error);
    }
    return {
        schemaVersion: 2,
        id: `${now.toString(36)}-${nonce}`,
        kind: params.kind,
        category: isHandoff ? null : (params.category || 'changed'),
        text: isHandoff ? (cleaned || 'Передано') : cleaned,
        authorId: author.id,
        authorName: author.name || 'Дизайнер',
        createdAt: now,
        updatedAt: now,
    };
}
function editHistoryRecord(previous, newText, now) {
    const value = cleanText(newText);
    if (!value)
        throw new Error('Текст записи не может быть пустым');
    return { ...previous, text: value, updatedAt: now };
}
function categoryLabel(category) {
    if (category === 'added')
        return 'Added';
    if (category === 'changed')
        return 'Changed';
    if (category === 'fixed')
        return 'Fixed';
    return '';
}
function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
/** Deliberately small Markdown subset: bold, HTTP(S) links and lists.
 * Text is never interpreted as HTML; other syntax remains literal. */
function parseMarkdown(text) {
    return text.replace(/\r\n?/g, '\n').split('\n').map((raw) => {
        let prefix = '';
        let line = raw;
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (bullet) {
            prefix = '• ';
            line = bullet[1];
        }
        else if (numbered) {
            prefix = `${numbered[1]}. `;
            line = numbered[2];
        }
        const segments = [];
        const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<>)]+)/gi;
        let cursor = 0;
        let match;
        while ((match = pattern.exec(line)) !== null) {
            if (match.index > cursor)
                segments.push({ kind: 'text', text: line.slice(cursor, match.index) });
            if (match[1] && match[2]) {
                segments.push({ kind: 'link', text: match[1], href: match[2] });
            }
            else if (match[3]) {
                segments.push({ kind: 'bold', text: match[3] });
            }
            else if (match[4]) {
                const href = match[4].replace(/[.,;!?]+$/, '');
                if (href)
                    segments.push({ kind: 'link', text: href, href });
                if (href.length < match[4].length)
                    segments.push({ kind: 'text', text: match[4].slice(href.length) });
            }
            cursor = pattern.lastIndex;
        }
        if (cursor < line.length)
            segments.push({ kind: 'text', text: line.slice(cursor) });
        if (segments.length === 0)
            segments.push({ kind: 'text', text: line || ' ' });
        return { prefix, segments };
    });
}

/** Coreon History Log — unified timeline, inline composer, basic Markdown. */
const { widget } = figma;
const { AutoLayout, Text, Span, Input, Line, useSyncedMap, useSyncedState, usePropertyMenu, useEffect } = widget;
const COLORS = {
    ink: '#1B1E23', muted: '#6D7280', subtle: '#E7E9EE', white: '#FFFFFF',
    surface: '#F7F8FA', accent: '#2369E8', green: '#237A54', amber: '#946200',
};
let resolveOpenPanel = null;
let panelOpen = false;
function MarkdownText({ source }) {
    const lines = parseMarkdown(source);
    const shown = lines.slice(0, MAX_CANVAS_LINES);
    return (figma.widget.h(AutoLayout, { direction: "vertical", width: "fill-parent", spacing: 3 },
        shown.map((line, lineIndex) => widget.h(Text, { key: lineIndex, width: 'fill-parent', fontSize: 13, lineHeight: 20, fill: COLORS.ink }, line.prefix, ...line.segments.map((segment, i) => {
            if (segment.kind === 'bold')
                return widget.h(Span, { key: i, fontWeight: 'bold' }, segment.text);
            if (segment.kind === 'link')
                return widget.h(Span, { key: i, href: segment.href, fill: COLORS.accent, textDecoration: 'underline' }, segment.text);
            return widget.h(Span, { key: i }, segment.text);
        }))),
        lines.length > MAX_CANVAS_LINES ? (figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0435\u043D\u0438\u0435 \u2014 \u0432\u043E \u0432\u0441\u0435\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438")) : null));
}
const FORMATTING_TOOLTIP = [
    'Форматирование',
    '**текст** — жирный',
    '[название](https://…) — ссылка',
    'https://… — автоматическая ссылка',
    '- пункт — список',
    '1. пункт — нумерация',
].join('\n');
function FormattingHint() {
    return (figma.widget.h(AutoLayout, { name: "Formatting tooltip", width: 20, height: 20, cornerRadius: 10, stroke: COLORS.muted, strokeWidth: 1, horizontalAlignItems: "center", verticalAlignItems: "center", tooltip: FORMATTING_TOOLTIP },
        figma.widget.h(Text, { fontSize: 12, fontWeight: "bold", fill: COLORS.muted, tooltip: FORMATTING_TOOLTIP }, "?")));
}
function CoreonHistoryLog() {
    // Keep the original map key. v1 product and DS records remain untouched.
    const items = useSyncedMap('history-records-v1');
    const [displayLimit, setDisplayLimit] = useSyncedState('history-display-limit-v1', 5);
    const [composerOpen, setComposerOpen] = useSyncedState('composer-open-v2', false);
    const [draft, setDraft] = useSyncedState('composer-draft-v2', '');
    const [editingId, setEditingId] = useSyncedState('editing-id-v2', null);
    const [editingDraft, setEditingDraft] = useSyncedState('editing-draft-v2', '');
    const [categoryEditorId, setCategoryEditorId] = useSyncedState('category-editor-id-v2', null);
    // Avoid duplicate commits if Figma reports the same blur event twice before re-render.
    let composerCommitted = false;
    let editorCommitted = false;
    const all = recordsForHistory(items.entries().map(([id, item]) => ({ ...item, id })));
    const recent = all.slice(0, LIMIT_OPTIONS.includes(displayLimit) ? displayLimit : 5);
    function snapshot() {
        return { type: 'STATE', records: recordsForHistory(items.entries().map(([id, r]) => ({ ...r, id }))) };
    }
    function openHistory() {
        panelOpen = true;
        return new Promise((resolve) => {
            resolveOpenPanel = resolve;
            figma.showUI(__html__, { width: 490, height: 630, title: 'Coreon History Log', themeColors: true });
            figma.ui.postMessage(snapshot());
        });
    }
    function writeRecord(kind, text, category) {
        const user = figma.currentUser;
        const entry = createHistoryRecord({ kind, text, category }, { id: (user === null || user === void 0 ? void 0 : user.id) || null, name: (user === null || user === void 0 ? void 0 : user.name) || 'Дизайнер' }, Date.now(), Math.random().toString(36).slice(2, 12));
        items.set(entry.id, entry);
    }
    function commitComposer(characters) {
        if (!composerOpen || composerCommitted)
            return;
        composerCommitted = true;
        const cleaned = cleanText(characters);
        // Clicking away from an empty input abandons the draft without creating a record.
        if (cleaned)
            writeRecord('change', cleaned, 'changed');
        setDraft('');
        setComposerOpen(false);
    }
    function startEdit(entry) {
        setEditingId(entry.id);
        setEditingDraft(entry.text);
        setCategoryEditorId(null);
    }
    function commitEdit(id, characters) {
        if (editorCommitted)
            return;
        editorCommitted = true;
        const old = items.get(id);
        const cleaned = cleanText(characters);
        if (old && cleaned && old.text !== cleaned) {
            items.set(id, editHistoryRecord(old, cleaned, Date.now()));
        }
        // Escape/no change or cleared input never overwrites the original record.
        setEditingId(null);
        setEditingDraft('');
    }
    function chooseCategory(entry, category) {
        if (entry.kind !== 'change')
            return;
        const old = items.get(entry.id);
        if (old && old.kind === 'change' && effectiveCategory(old) !== category) {
            items.set(entry.id, { ...old, category, updatedAt: Date.now() });
        }
        setCategoryEditorId(null);
    }
    useEffect(() => {
        figma.ui.onmessage = (message) => {
            try {
                if (message.type === 'EDIT' && typeof message.id === 'string') {
                    const old = items.get(message.id);
                    if (!old)
                        throw new Error('Запись не найдена');
                    items.set(message.id, editHistoryRecord(old, message.newText || '', Date.now()));
                    figma.ui.postMessage({ type: 'SAVED' });
                    figma.ui.postMessage(snapshot());
                }
                else if (message.type === 'DELETE' && typeof message.id === 'string') {
                    const old = items.get(message.id);
                    if (!old)
                        throw new Error('Запись уже удалена или не найдена');
                    items.delete(message.id);
                    figma.ui.postMessage({ type: 'DELETED', id: message.id });
                    figma.ui.postMessage(snapshot());
                }
                else if (message.type === 'REQUEST_STATE') {
                    figma.ui.postMessage(snapshot());
                }
                else if (message.type === 'CLOSE') {
                    panelOpen = false;
                    figma.ui.close();
                    const resolve = resolveOpenPanel;
                    resolveOpenPanel = null;
                    resolve === null || resolve === void 0 ? void 0 : resolve();
                }
            }
            catch (error) {
                figma.ui.postMessage({ type: 'ERROR', message: error instanceof Error ? error.message : 'Не удалось сохранить запись' });
            }
        };
        if (panelOpen)
            figma.ui.postMessage(snapshot());
    });
    usePropertyMenu([
        {
            itemType: 'dropdown', propertyName: 'limit', tooltip: 'Записей на холсте',
            selectedOption: String(displayLimit),
            options: LIMIT_OPTIONS.map((n) => ({ option: String(n), label: String(n) })),
        },
    ], ({ propertyName, propertyValue }) => {
        if (propertyName === 'limit' && LIMIT_OPTIONS.includes(Number(propertyValue))) {
            setDisplayLimit(Number(propertyValue));
        }
    });
    return (figma.widget.h(AutoLayout, { name: "Coreon History Log", direction: "vertical", width: 410, spacing: 0, padding: 16, fill: COLORS.white, cornerRadius: 12, stroke: COLORS.subtle, strokeWidth: 1 },
        figma.widget.h(AutoLayout, { direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 10, padding: { bottom: 13 } },
            figma.widget.h(AutoLayout, { direction: "vertical", spacing: 4, width: "fill-parent" },
                figma.widget.h(Text, { fontSize: 17, fontWeight: "bold", fill: COLORS.ink }, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439"),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted },
                    all.length,
                    " \u0437\u0430\u043F\u0438\u0441\u0435\u0439")),
            figma.widget.h(AutoLayout, { name: "Toggle composer", onClick: () => { if (!composerOpen)
                    setComposerOpen(true); }, padding: { horizontal: 11, vertical: 8 }, fill: COLORS.accent, cornerRadius: 7, hoverStyle: { fill: '#1856C3' } },
                figma.widget.h(Text, { fill: COLORS.white, fontSize: 13, fontWeight: "bold" }, "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"))),
        composerOpen ? (figma.widget.h(AutoLayout, { name: "Inline composer", direction: "vertical", width: "fill-parent", spacing: 6, padding: { bottom: 8 } },
            figma.widget.h(AutoLayout, { width: "fill-parent", direction: "horizontal", verticalAlignItems: "center", spacing: 8 },
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C \u00B7 Changed"),
                figma.widget.h(AutoLayout, { width: "fill-parent" }),
                FormattingHint()),
            figma.widget.h(Input, { name: "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C", value: draft, inputBehavior: "multiline", width: "fill-parent", fontSize: 13, lineHeight: 20, fill: COLORS.ink, placeholder: "\u0427\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C?", placeholderProps: { fill: COLORS.muted }, inputFrameProps: { padding: 0, fill: COLORS.white }, onTextEditEnd: (event) => commitComposer(event.characters) }))) : null,
        recent.length === 0 ? (figma.widget.h(AutoLayout, { width: "fill-parent", fill: COLORS.surface, padding: 20, cornerRadius: 8 },
            figma.widget.h(Text, { fontSize: 13, fill: COLORS.muted }, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E."))) : recent.map((entry) => (figma.widget.h(AutoLayout, { key: entry.id, name: "History entry", direction: "vertical", width: "fill-parent", spacing: 7, padding: { top: 11, bottom: 13 } },
            entry.kind === 'handoff' ? (figma.widget.h(AutoLayout, { direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 8 },
                figma.widget.h(Text, { fontWeight: "bold", fontSize: 12, fill: COLORS.ink }, entry.authorName),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, formatDateTime(entry.createdAt)),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.green, fontWeight: "bold" }, "\u041F\u0435\u0440\u0435\u0434\u0430\u043D\u043E"))) : (figma.widget.h(AutoLayout, { name: "Category trigger", direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 8, onClick: () => setCategoryEditorId(categoryEditorId === entry.id ? null : entry.id) },
                figma.widget.h(Text, { fontWeight: "bold", fontSize: 12, fill: COLORS.ink }, entry.authorName),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, formatDateTime(entry.createdAt)),
                figma.widget.h(AutoLayout, { width: "fill-parent" }),
                figma.widget.h(Text, { name: "Category hover action", fontSize: 11, fill: effectiveCategory(entry) === 'added' ? COLORS.green : effectiveCategory(entry) === 'fixed' ? COLORS.amber : COLORS.accent, opacity: effectiveCategory(entry) === 'changed' ? 0 : 1, hoverStyle: { opacity: 1 }, tooltip: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E" }, effectiveCategory(entry) === 'changed' ? '+ Категория' : categoryLabel(effectiveCategory(entry))))),
            categoryEditorId === entry.id && entry.kind === 'change' ? (figma.widget.h(AutoLayout, { name: "Category chooser", direction: "horizontal", spacing: 6 }, ['changed', 'added', 'fixed'].map(category => (figma.widget.h(AutoLayout, { key: category, name: `Choose category ${category}`, onClick: () => chooseCategory(entry, category), padding: { horizontal: 8, vertical: 5 }, cornerRadius: 5, fill: effectiveCategory(entry) === category ? '#DBE8FF' : COLORS.surface },
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.ink }, categoryLabel(category))))))) : null,
            entry.kind === 'handoff' ? (figma.widget.h(Text, { fontSize: 13, fill: COLORS.ink }, entry.text)) : editingId === entry.id ? (figma.widget.h(AutoLayout, { name: "Inline editor", direction: "vertical", width: "fill-parent", spacing: 4 },
                figma.widget.h(AutoLayout, { direction: "horizontal", width: "fill-parent", verticalAlignItems: "center" },
                    figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u00B7 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043F\u0440\u0438 \u0432\u044B\u0445\u043E\u0434\u0435 \u0438\u0437 \u043F\u043E\u043B\u044F"),
                    figma.widget.h(AutoLayout, { width: "fill-parent" }),
                    FormattingHint()),
                figma.widget.h(Input, { name: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438", value: editingDraft, inputBehavior: "multiline", width: "fill-parent", fontSize: 13, lineHeight: 20, fill: COLORS.ink, inputFrameProps: { padding: 0, fill: COLORS.white }, onTextEditEnd: (event) => commitEdit(entry.id, event.characters) }))) : (figma.widget.h(AutoLayout, { width: "fill-parent", spacing: 6, direction: "vertical" },
                MarkdownText({ source: entry.text }),
                figma.widget.h(AutoLayout, { name: "Edit on canvas", onClick: () => startEdit(entry) },
                    figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C")))),
            figma.widget.h(Line, { length: "fill-parent", stroke: COLORS.subtle, strokeWidth: 1 })))),
        figma.widget.h(AutoLayout, { name: "Open history", width: "fill-parent", horizontalAlignItems: "center", padding: { top: 13, bottom: 2 }, onClick: openHistory },
            figma.widget.h(Text, { fontSize: 12, fontWeight: "bold", fill: COLORS.accent, hoverStyle: { fill: '#1856C3' } },
                "\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F",
                all.length > recent.length ? ` · ещё ${all.length - recent.length}` : ''))));
}
widget.register(CoreonHistoryLog);
