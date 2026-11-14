/* Generated: do not edit manually */
const MAX_TEXT_LENGTH = 5000;
const LIMIT_OPTIONS = [3, 5, 10, 15];
function cleanText(value) {
    return value.trim().slice(0, MAX_TEXT_LENGTH);
}
function validateChange(mode, text, category) {
    if (!cleanText(text))
        return 'Добавьте описание изменений';
    if (mode === 'ds' && !category)
        return 'Выберите категорию изменения';
    return null;
}
function byNewest(records) {
    return records.sort((a, b) => (b.createdAt - a.createdAt) || b.id.localeCompare(a.id));
}
function recordsForMode(records, mode) {
    return byNewest(records.filter((entry) => entry.mode === mode));
}
function visibleRecords(records, mode, limit) {
    return recordsForMode(records, mode).slice(0, LIMIT_OPTIONS.includes(limit) ? limit : 5);
}
function createHistoryRecord(params, author, now, nonce) {
    const isHandoff = params.kind === 'handoff';
    if (isHandoff && params.mode !== 'ds')
        throw new Error('Передача доступна только для дизайн-системы');
    const cleaned = cleanText(params.text);
    if (!isHandoff) {
        const error = validateChange(params.mode, cleaned, params.category);
        if (error)
            throw new Error(error);
    }
    return {
        schemaVersion: 1,
        id: `${now.toString(36)}-${nonce}`,
        mode: params.mode,
        kind: params.kind,
        category: isHandoff || params.mode === 'product' ? null : params.category,
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

/** Coreon History Log widget. Rendering only depends on synchronized widget state. */
const { widget } = figma;
const { AutoLayout, Text, Input, Line, useSyncedMap, useSyncedState, usePropertyMenu, useEffect } = widget;
const COLORS = {
    ink: '#1B1E23', muted: '#6D7280', subtle: '#E7E9EE', white: '#FFFFFF',
    surface: '#F7F8FA', accent: '#2369E8', green: '#237A54', amber: '#946200',
};
let currentPanel = null;
let resolveOpenPanel = null;
function CoreonHistoryLog() {
    const items = useSyncedMap('history-records-v1');
    const [mode, setMode] = useSyncedState('history-mode-v1', 'product');
    const [displayLimit, setDisplayLimit] = useSyncedState('history-display-limit-v1', 5);
    const all = items.entries().map(([id, item]) => ({ ...item, id }));
    const current = recordsForMode(all, mode);
    const recent = current.slice(0, LIMIT_OPTIONS.includes(displayLimit) ? displayLimit : 5);
    function snapshot() {
        return { type: 'STATE', mode, records: recordsForMode(items.entries().map(([id, r]) => ({ ...r, id })), mode) };
    }
    function present(panel) {
        currentPanel = panel;
        // Figma stops a widget after a synchronous click handler. Keep the handler
        // alive while its iframe is in use (Figma Widgets: Handling User Events).
        return new Promise((resolve) => {
            resolveOpenPanel = resolve;
            figma.showUI(__html__, { width: 440, height: panel === 'add' ? 390 : 580, title: 'Coreon History Log', themeColors: true });
            figma.ui.postMessage({ ...snapshot(), panel });
        });
    }
    function saveNew(message) {
        const author = figma.currentUser;
        const timestamp = Date.now();
        const kind = message.kind === 'handoff' ? 'handoff' : 'change';
        const entry = createHistoryRecord({ mode, kind, text: message.text || '', category: message.category || null }, { id: (author === null || author === void 0 ? void 0 : author.id) || null, name: (author === null || author === void 0 ? void 0 : author.name) || 'Дизайнер' }, timestamp, Math.random().toString(36).slice(2, 12));
        items.set(entry.id, entry);
        return entry;
    }
    useEffect(() => {
        figma.ui.onmessage = (message) => {
            try {
                if (message.type === 'ADD') {
                    saveNew(message);
                    figma.ui.postMessage({ type: 'SAVED' });
                    figma.ui.postMessage(snapshot());
                }
                else if (message.type === 'EDIT' && typeof message.id === 'string') {
                    const previous = items.get(message.id);
                    if (!previous || previous.mode !== mode)
                        throw new Error('Запись не найдена');
                    items.set(message.id, editHistoryRecord(previous, message.newText || '', Date.now()));
                    figma.ui.postMessage({ type: 'SAVED' });
                    figma.ui.postMessage(snapshot());
                }
                else if (message.type === 'REQUEST_STATE') {
                    figma.ui.postMessage(snapshot());
                }
                else if (message.type === 'CLOSE') {
                    currentPanel = null;
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
        if (currentPanel)
            figma.ui.postMessage(snapshot());
    });
    usePropertyMenu([
        {
            itemType: 'dropdown', propertyName: 'mode', tooltip: 'Тип журнала',
            selectedOption: mode,
            options: [{ option: 'product', label: 'Продуктовые макеты' }, { option: 'ds', label: 'Дизайн-система' }],
        },
        {
            itemType: 'dropdown', propertyName: 'limit', tooltip: 'Записей на холсте',
            selectedOption: String(displayLimit),
            options: LIMIT_OPTIONS.map((n) => ({ option: String(n), label: String(n) })),
        },
    ], ({ propertyName, propertyValue }) => {
        if (propertyName === 'mode' && (propertyValue === 'product' || propertyValue === 'ds')) {
            setMode(propertyValue);
            setDisplayLimit(propertyValue === 'product' ? 5 : 10);
        }
        if (propertyName === 'limit' && LIMIT_OPTIONS.includes(Number(propertyValue))) {
            setDisplayLimit(Number(propertyValue));
        }
    });
    return (figma.widget.h(AutoLayout, { name: "Coreon History Log", direction: "vertical", width: 410, spacing: 0, padding: 16, fill: COLORS.white, cornerRadius: 12, stroke: COLORS.subtle, strokeWidth: 1 },
        figma.widget.h(AutoLayout, { direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 10, padding: { bottom: 13 } },
            figma.widget.h(AutoLayout, { direction: "vertical", spacing: 4, width: "fill-parent" },
                figma.widget.h(Text, { fontSize: 17, fontWeight: "bold", fill: COLORS.ink }, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439"),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted },
                    mode === 'product' ? 'Макеты' : 'Дизайн-система',
                    " \u00B7 ",
                    current.length,
                    " \u0437\u0430\u043F\u0438\u0441\u0435\u0439")),
            figma.widget.h(AutoLayout, { onClick: () => present('add'), padding: { horizontal: 11, vertical: 8 }, fill: COLORS.accent, cornerRadius: 7, hoverStyle: { fill: '#1856C3' } },
                figma.widget.h(Text, { fill: COLORS.white, fontSize: 13, fontWeight: "bold" }, "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"))),
        recent.length === 0 ? (figma.widget.h(AutoLayout, { width: "fill-parent", fill: COLORS.surface, padding: 20, cornerRadius: 8 },
            figma.widget.h(Text, { fontSize: 13, fill: COLORS.muted }, "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E."))) : recent.map((entry) => (figma.widget.h(AutoLayout, { key: entry.id, name: "History entry", direction: "vertical", width: "fill-parent", spacing: 6, padding: { top: 11, bottom: 13 } },
            figma.widget.h(AutoLayout, { direction: "horizontal", width: "fill-parent", verticalAlignItems: "center", spacing: 8 },
                figma.widget.h(Text, { fontWeight: "bold", fontSize: 12, fill: COLORS.ink }, entry.authorName),
                figma.widget.h(Text, { fontSize: 11, fill: COLORS.muted }, new Date(entry.createdAt).toLocaleDateString('ru-RU')),
                entry.kind === 'handoff' ? (figma.widget.h(Text, { fontSize: 11, fill: COLORS.green, fontWeight: "bold" }, "\u041F\u0435\u0440\u0435\u0434\u0430\u043D\u043E")) : (entry.mode === 'ds' && entry.category ? (figma.widget.h(Text, { fontSize: 11, fill: entry.category === 'added' ? COLORS.green : entry.category === 'changed' ? COLORS.amber : COLORS.muted }, categoryLabel(entry.category))) : null)),
            entry.kind === 'handoff' ? (figma.widget.h(Text, { fontSize: 13, fill: COLORS.ink }, entry.text)) : (figma.widget.h(Input, { name: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C", value: entry.text, inputBehavior: "multiline", width: "fill-parent", fontSize: 13, lineHeight: 20, fill: COLORS.ink, inputFrameProps: { padding: 0, fill: COLORS.white }, onTextEditEnd: (event) => {
                    const latest = items.get(entry.id);
                    if (latest && event.characters.trim() && latest.text !== event.characters.trim()) {
                        items.set(entry.id, editHistoryRecord(latest, event.characters, Date.now()));
                    }
                } })),
            figma.widget.h(Line, { length: "fill-parent", stroke: COLORS.subtle, strokeWidth: 1 })))),
        figma.widget.h(AutoLayout, { width: "fill-parent", horizontalAlignItems: "center", padding: { top: 13, bottom: 2 }, onClick: () => present('history') },
            figma.widget.h(Text, { fontSize: 12, fontWeight: "bold", fill: COLORS.accent, hoverStyle: { fill: '#1856C3' } },
                "\u0412\u0441\u044F \u0438\u0441\u0442\u043E\u0440\u0438\u044F",
                current.length > recent.length ? ` · ещё ${current.length - recent.length}` : ''))));
}
widget.register(CoreonHistoryLog);
