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
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
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
const { AutoLayout, Text, Span, Input, SVG, Line, useSyncedMap, useSyncedState, usePropertyMenu, useEffect } = widget;
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
// Small experimental pencil asset. Final icon will be sourced from Coreon DS.
const PENCIL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10.8 2.1 13.9 5.2M2.1 13.9l3.7-.8 7.1-7.2a2.15 2.15 0 0 0-3.05-3.03L2.8 10.1l-.7 3.8Z" stroke="#6D7280" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const FORMATTING_TOOLTIP = [
    'Форматирование',
    '**текст** — жирный',
    '[название](https://…) — ссылка',
    'https://… — автоматическая ссылка',
    '- пункт — список',
    '1. пункт — нумерация',
].join('\n');
// Exact vector export from the Coreon DS helpCircleLine component (20x20).
const COREON_HELP_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 12.5C10.4602 12.5 10.8333 12.8731 10.8333 13.3333C10.8333 13.7936 10.4602 14.1667 10 14.1667C9.53976 14.1667 9.16667 13.7936 9.16667 13.3333C9.16667 12.8731 9.53976 12.5 10 12.5Z" fill="#161E29" fill-opacity="0.85"/><path d="M9.98698 5.83333C10.7522 5.83333 11.3622 6.03063 11.8172 6.42497C12.2722 6.81939 12.5 7.33392 12.5 7.96794C12.4999 8.45795 12.3724 8.88166 12.1175 9.23909C11.9703 9.44331 11.7603 9.62236 11.5527 9.79899C11.1896 10.108 10.8333 10.4109 10.8333 10.8333V11.3338C10.8332 11.5178 10.6837 11.6667 10.4997 11.6667H9.50033C9.31637 11.6667 9.16508 11.5176 9.15934 11.3338C9.14997 11.0221 9.14751 10.7206 9.26676 10.4346C9.51706 9.83432 9.87673 9.53651 10.236 9.23909C10.4053 9.09891 10.5748 8.95827 10.7324 8.78662C10.9253 8.58029 11.0782 8.35279 11.0783 8.01758C11.0783 7.69326 10.9867 7.44255 10.804 7.26562C10.6248 7.085 10.3524 6.99463 9.98698 6.99463C9.63204 6.99464 9.35805 7.08106 9.16504 7.25423C8.97203 7.42377 8.87536 7.66527 8.87533 7.97852C8.87533 8.17856 8.71322 8.34065 8.51318 8.34066H7.87842C7.66944 8.34045 7.50008 8.17125 7.5 7.96224C7.5 7.30242 7.72776 6.78267 8.18278 6.40299C8.64121 6.02338 9.24249 5.83335 9.98698 5.83333Z" fill="#161E29" fill-opacity="0.85"/><path fill-rule="evenodd" clip-rule="evenodd" d="M10 2.5C14.1421 2.5 17.5 5.85786 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5ZM10 3.75C6.54822 3.75 3.75 6.54822 3.75 10C3.75 13.4518 6.54822 16.25 10 16.25C13.4518 16.25 16.25 13.4518 16.25 10C16.25 6.54822 13.4518 3.75 10 3.75Z" fill="#161E29" fill-opacity="0.85"/></svg>';
function FormattingHint() {
    return (figma.widget.h(SVG, { name: "Coreon formatting help", src: COREON_HELP_SVG, width: 20, height: 20, tooltip: FORMATTING_TOOLTIP }));
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
        if (composerCommitted)
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
        figma.widget.h(AutoLayout, { name: "Header", direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 10, padding: { bottom: 10 } },
            figma.widget.h(AutoLayout, { direction: "vertical", spacing: 4, width: "fill-parent" },
                figma.widget.h(Text, { fontSize: 17, fontWeight: "bold", fill: COLORS.ink }, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439"),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted },
                    all.length,
                    " \u0437\u0430\u043F\u0438\u0441\u0435\u0439")),
            FormattingHint()),
        figma.widget.h(AutoLayout, { name: "Inline composer", direction: "vertical", width: "fill-parent", spacing: 0, padding: { bottom: 8 } },
            figma.widget.h(Input, { name: "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u043F\u0438\u0441\u044C", value: draft, inputBehavior: "multiline", width: "fill-parent", fontSize: 13, lineHeight: 20, fill: COLORS.ink, placeholder: "\u0427\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C?", placeholderProps: { fill: COLORS.muted }, inputFrameProps: { padding: { horizontal: 10, vertical: 8 }, fill: '#F4F5F7', cornerRadius: 6 }, onTextEditEnd: (event) => commitComposer(event.characters) })),
        recent.length === 0 ? (figma.widget.h(AutoLayout, { width: "fill-parent", fill: COLORS.surface, padding: 20, cornerRadius: 8 },
            figma.widget.h(Text, { fontSize: 13, fill: COLORS.muted }, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E."))) : recent.map((entry) => (figma.widget.h(AutoLayout, { key: entry.id, name: "History entry", direction: "vertical", width: "fill-parent", spacing: 7, padding: { top: 11, bottom: 13 } },
            entry.kind === 'handoff' ? (figma.widget.h(AutoLayout, { direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 8 },
                figma.widget.h(Text, { fontWeight: "bold", fontSize: 12, fill: COLORS.ink }, entry.authorName),
                figma.widget.h(Text, { fontFamily: "JetBrains Mono", fontSize: 11, fill: COLORS.muted }, formatDateTime(entry.createdAt)),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.green, fontWeight: "bold" }, "\u041F\u0435\u0440\u0435\u0434\u0430\u043D\u043E"))) : (figma.widget.h(AutoLayout, { name: "Category trigger", direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 8, onClick: () => setCategoryEditorId(categoryEditorId === entry.id ? null : entry.id) },
                figma.widget.h(Text, { fontWeight: "bold", fontSize: 12, fill: COLORS.ink }, entry.authorName),
                figma.widget.h(Text, { fontFamily: "JetBrains Mono", fontSize: 11, fill: COLORS.muted }, formatDateTime(entry.createdAt)),
                figma.widget.h(AutoLayout, { width: "fill-parent", height: 1 }),
                figma.widget.h(Text, { name: "Category hover action", fontSize: 11, fill: effectiveCategory(entry) === 'added' ? COLORS.green : effectiveCategory(entry) === 'fixed' ? COLORS.amber : COLORS.accent, opacity: effectiveCategory(entry) === 'changed' ? 0 : 1, hoverStyle: { opacity: 1 }, tooltip: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044E" }, effectiveCategory(entry) === 'changed' ? '+ Кат.' : categoryLabel(effectiveCategory(entry))))),
            categoryEditorId === entry.id && entry.kind === 'change' ? (figma.widget.h(AutoLayout, { name: "Category chooser", direction: "horizontal", spacing: 6 }, ['changed', 'added', 'fixed'].map(category => (figma.widget.h(AutoLayout, { key: category, name: `Choose category ${category}`, onClick: () => chooseCategory(entry, category), padding: { horizontal: 8, vertical: 5 }, cornerRadius: 5, fill: effectiveCategory(entry) === category ? '#DBE8FF' : COLORS.surface },
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.ink }, categoryLabel(category))))))) : null,
            entry.kind === 'handoff' ? (figma.widget.h(Text, { fontSize: 13, fill: COLORS.ink }, entry.text)) : editingId === entry.id ? (figma.widget.h(Input, { name: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0437\u0430\u043F\u0438\u0441\u0438", value: editingDraft, inputBehavior: "multiline", width: "fill-parent", fontSize: 13, lineHeight: 20, fill: COLORS.ink, inputFrameProps: { padding: { horizontal: 10, vertical: 8 }, fill: '#F4F5F7', cornerRadius: 6 }, onTextEditEnd: (event) => commitEdit(entry.id, event.characters) })) : (figma.widget.h(AutoLayout, { name: "Entry hover editing", direction: "horizontal", width: "fill-parent", spacing: 4, verticalAlignItems: "start", onClick: () => startEdit(entry) },
                figma.widget.h(AutoLayout, { name: "Entry formatted content", width: "fill-parent", direction: "vertical" }, MarkdownText({ source: entry.text })),
                figma.widget.h(AutoLayout, { name: "Pencil slot", width: 24, height: 24, verticalAlignItems: "center", horizontalAlignItems: "center" },
                    figma.widget.h(SVG, { name: "Pencil hover glyph", src: PENCIL_SVG, width: 16, height: 16, opacity: 0, hoverStyle: { opacity: 1 } })))),
            figma.widget.h(Line, { length: "fill-parent", stroke: COLORS.subtle, strokeWidth: 1 })))),
        figma.widget.h(AutoLayout, { name: "Open history", width: "fill-parent", horizontalAlignItems: "center", padding: { top: 13, bottom: 2 }, onClick: openHistory },
            figma.widget.h(Text, { fontSize: 12, fontWeight: "bold", fill: COLORS.accent, hoverStyle: { fill: '#1856C3' } },
                "\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F",
                all.length > recent.length ? ` · ещё ${all.length - recent.length}` : ''))));
}
widget.register(CoreonHistoryLog);
