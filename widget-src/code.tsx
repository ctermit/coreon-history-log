/** Coreon History Log — unified timeline, inline composer, basic Markdown. */
const { widget } = figma;
const { AutoLayout, Text, Span, Input, Line, useSyncedMap, useSyncedState, usePropertyMenu, useEffect } = widget;

const COLORS = {
  ink: '#1B1E23', muted: '#6D7280', subtle: '#E7E9EE', white: '#FFFFFF',
  surface: '#F7F8FA', accent: '#2369E8', green: '#237A54', amber: '#946200',
};

let resolveOpenPanel: (() => void) | null = null;
let panelOpen = false;

function MarkdownText({ source }: { source: string }) {
  const lines = parseMarkdown(source);
  const shown = lines.slice(0, MAX_CANVAS_LINES);
  return (
    <AutoLayout direction="vertical" width="fill-parent" spacing={3}>
      {shown.map((line, lineIndex) => widget.h(
        Text,
        { key: lineIndex, width: 'fill-parent', fontSize: 13, lineHeight: 20, fill: COLORS.ink },
        line.prefix,
        ...line.segments.map((segment, i) => {
          if (segment.kind === 'bold') return widget.h(Span, { key: i, fontWeight: 'bold' }, segment.text);
          if (segment.kind === 'link') return widget.h(Span, { key: i, href: segment.href, fill: COLORS.accent, textDecoration: 'underline' }, segment.text);
          return widget.h(Span, { key: i }, segment.text);
        }),
      ))}
      {lines.length > MAX_CANVAS_LINES ? (
        <Text fontSize={11} fill={COLORS.muted}>Продолжение — во всей истории</Text>
      ) : null}
    </AutoLayout>
  );
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
  return (
    <AutoLayout name="Formatting tooltip" width={20} height={20} cornerRadius={10}
      stroke={COLORS.muted} strokeWidth={1} horizontalAlignItems="center" verticalAlignItems="center"
      tooltip={FORMATTING_TOOLTIP}>
      <Text fontSize={12} fontWeight="bold" fill={COLORS.muted} tooltip={FORMATTING_TOOLTIP}>?</Text>
    </AutoLayout>
  );
}

function CoreonHistoryLog() {
  // Keep the original map key. v1 product and DS records remain untouched.
  const items = useSyncedMap<HistoryRecord>('history-records-v1');
  const [displayLimit, setDisplayLimit] = useSyncedState<number>('history-display-limit-v1', 5);
  const [composerOpen, setComposerOpen] = useSyncedState<boolean>('composer-open-v2', false);
  const [draft, setDraft] = useSyncedState<string>('composer-draft-v2', '');
  const [editingId, setEditingId] = useSyncedState<string | null>('editing-id-v2', null);
  const [editingDraft, setEditingDraft] = useSyncedState<string>('editing-draft-v2', '');
  const [categoryEditorId, setCategoryEditorId] = useSyncedState<string | null>('category-editor-id-v2', null);
  // Avoid duplicate commits if Figma reports the same blur event twice before re-render.
  let composerCommitted = false;
  let editorCommitted = false;
  const all = recordsForHistory(items.entries().map(([id, item]) => ({ ...item, id })));
  const recent = all.slice(0, LIMIT_OPTIONS.includes(displayLimit) ? displayLimit : 5);

  function snapshot() {
    return { type: 'STATE', records: recordsForHistory(items.entries().map(([id, r]) => ({ ...r, id }))) };
  }

  function openHistory(): Promise<void> {
    panelOpen = true;
    return new Promise<void>((resolve) => {
      resolveOpenPanel = resolve;
      figma.showUI(__html__, { width: 490, height: 630, title: 'Coreon History Log', themeColors: true });
      figma.ui.postMessage(snapshot());
    });
  }

  function writeRecord(kind: LogKind, text: string, category: ChangeCategory | null) {
    const user = figma.currentUser;
    const entry = createHistoryRecord(
      { kind, text, category },
      { id: user?.id || null, name: user?.name || 'Дизайнер' },
      Date.now(), Math.random().toString(36).slice(2, 12),
    );
    items.set(entry.id, entry);
  }

  function commitComposer(characters: string) {
    if (!composerOpen || composerCommitted) return;
    composerCommitted = true;
    const cleaned = cleanText(characters);
    // Clicking away from an empty input abandons the draft without creating a record.
    if (cleaned) writeRecord('change', cleaned, 'changed');
    setDraft('');
    setComposerOpen(false);
  }

  function startEdit(entry: HistoryRecord) {
    setEditingId(entry.id);
    setEditingDraft(entry.text);
    setCategoryEditorId(null);
  }

  function commitEdit(id: string, characters: string) {
    if (editorCommitted) return;
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

  function chooseCategory(entry: HistoryRecord, category: ChangeCategory) {
    if (entry.kind !== 'change') return;
    const old = items.get(entry.id);
    if (old && old.kind === 'change' && effectiveCategory(old) !== category) {
      items.set(entry.id, { ...old, category, updatedAt: Date.now() });
    }
    setCategoryEditorId(null);
  }

  useEffect(() => {
    figma.ui.onmessage = (message: { type: string; id?: string; newText?: string }) => {
      try {
        if (message.type === 'EDIT' && typeof message.id === 'string') {
          const old = items.get(message.id);
          if (!old) throw new Error('Запись не найдена');
          items.set(message.id, editHistoryRecord(old, message.newText || '', Date.now()));
          figma.ui.postMessage({ type: 'SAVED' });
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'DELETE' && typeof message.id === 'string') {
          const old = items.get(message.id);
          if (!old) throw new Error('Запись уже удалена или не найдена');
          items.delete(message.id);
          figma.ui.postMessage({ type: 'DELETED', id: message.id });
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'REQUEST_STATE') {
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'CLOSE') {
          panelOpen = false;
          figma.ui.close();
          const resolve = resolveOpenPanel;
          resolveOpenPanel = null;
          resolve?.();
        }
      } catch (error) {
        figma.ui.postMessage({ type: 'ERROR', message: error instanceof Error ? error.message : 'Не удалось сохранить запись' });
      }
    };
    if (panelOpen) figma.ui.postMessage(snapshot());
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

  return (
    <AutoLayout name="Coreon History Log" direction="vertical" width={410} spacing={0}
      padding={16} fill={COLORS.white} cornerRadius={12} stroke={COLORS.subtle} strokeWidth={1}>
      <AutoLayout direction="horizontal" width="fill-parent" verticalAlignItems="center" spacing={10} padding={{ bottom: 13 }}>
        <AutoLayout direction="vertical" spacing={4} width="fill-parent">
          <Text fontSize={17} fontWeight="bold" fill={COLORS.ink}>История изменений</Text>
          <Text fontSize={11} fill={COLORS.muted}>{all.length} записей</Text>
        </AutoLayout>
        <AutoLayout name="Toggle composer" onClick={() => { if (!composerOpen) setComposerOpen(true); }}
          padding={{ horizontal: 11, vertical: 8 }} fill={COLORS.accent} cornerRadius={7}
          hoverStyle={{ fill: '#1856C3' }}>
          <Text fill={COLORS.white} fontSize={13} fontWeight="bold">+ Добавить</Text>
        </AutoLayout>
      </AutoLayout>

      {composerOpen ? (
        <AutoLayout name="Inline composer" direction="vertical" width="fill-parent" spacing={6} padding={{ bottom: 8 }}>
          <AutoLayout width="fill-parent" direction="horizontal" verticalAlignItems="center" spacing={8}>
            <Text fontSize={11} fill={COLORS.muted}>Новая запись · Changed</Text>
            <AutoLayout width="fill-parent" />
            {FormattingHint()}
          </AutoLayout>
          <Input name="Новая запись" value={draft} inputBehavior="multiline" width="fill-parent"
            fontSize={13} lineHeight={20} fill={COLORS.ink}
            placeholder="Что изменилось?"
            placeholderProps={{ fill: COLORS.muted }}
            inputFrameProps={{ padding: 0, fill: COLORS.white }}
            onTextEditEnd={(event) => commitComposer(event.characters)} />
        </AutoLayout>
      ) : null}

      {recent.length === 0 ? (
        <AutoLayout width="fill-parent" fill={COLORS.surface} padding={20} cornerRadius={8}>
          <Text fontSize={13} fill={COLORS.muted}>Пока нет записей. Добавьте первую.</Text>
        </AutoLayout>
      ) : recent.map((entry) => (
        <AutoLayout key={entry.id} name="History entry" direction="vertical" width="fill-parent"
          spacing={7} padding={{ top: 11, bottom: 13 }}>
          {entry.kind === 'handoff' ? (
            <AutoLayout direction="horizontal" width="fill-parent" verticalAlignItems="center" spacing={8}>
              <Text fontWeight="bold" fontSize={12} fill={COLORS.ink}>{entry.authorName}</Text>
              <Text fontSize={11} fill={COLORS.muted}>{formatDateTime(entry.createdAt)}</Text>
              <Text fontSize={11} fill={COLORS.green} fontWeight="bold">Передано</Text>
            </AutoLayout>
          ) : (
            <AutoLayout name="Category trigger" direction="horizontal" width="fill-parent" verticalAlignItems="center"
              spacing={8} onClick={() => setCategoryEditorId(categoryEditorId === entry.id ? null : entry.id)}>
              <Text fontWeight="bold" fontSize={12} fill={COLORS.ink}>{entry.authorName}</Text>
              <Text fontSize={11} fill={COLORS.muted}>{formatDateTime(entry.createdAt)}</Text>
              <AutoLayout width="fill-parent" />
              <Text name="Category hover action" fontSize={11}
                fill={effectiveCategory(entry) === 'added' ? COLORS.green : effectiveCategory(entry) === 'fixed' ? COLORS.amber : COLORS.accent}
                opacity={effectiveCategory(entry) === 'changed' ? 0 : 1} hoverStyle={{ opacity: 1 }}
                tooltip="Изменить категорию">
                {effectiveCategory(entry) === 'changed' ? '+ Категория' : categoryLabel(effectiveCategory(entry))}
              </Text>
            </AutoLayout>
          )}
          {categoryEditorId === entry.id && entry.kind === 'change' ? (
            <AutoLayout name="Category chooser" direction="horizontal" spacing={6}>
              {(['changed', 'added', 'fixed'] as ChangeCategory[]).map(category => (
                <AutoLayout key={category} name={`Choose category ${category}`}
                  onClick={() => chooseCategory(entry, category)} padding={{ horizontal: 8, vertical: 5 }}
                  cornerRadius={5} fill={effectiveCategory(entry) === category ? '#DBE8FF' : COLORS.surface}>
                  <Text fontSize={11} fill={COLORS.ink}>{categoryLabel(category)}</Text>
                </AutoLayout>
              ))}
            </AutoLayout>
          ) : null}
          {entry.kind === 'handoff' ? (
            <Text fontSize={13} fill={COLORS.ink}>{entry.text}</Text>
          ) : editingId === entry.id ? (
            <AutoLayout name="Inline editor" direction="vertical" width="fill-parent" spacing={4}>
              <AutoLayout direction="horizontal" width="fill-parent" verticalAlignItems="center">
                <Text fontSize={11} fill={COLORS.muted}>Редактирование · сохранение при выходе из поля</Text>
                <AutoLayout width="fill-parent" />
                {FormattingHint()}
              </AutoLayout>
              <Input name="Редактирование записи" value={editingDraft} inputBehavior="multiline"
                width="fill-parent" fontSize={13} lineHeight={20} fill={COLORS.ink}
                inputFrameProps={{ padding: 0, fill: COLORS.white }}
                onTextEditEnd={(event) => commitEdit(entry.id, event.characters)} />
            </AutoLayout>
          ) : (
            <AutoLayout width="fill-parent" spacing={6} direction="vertical">
              {MarkdownText({ source: entry.text })}
              <AutoLayout name="Edit on canvas" onClick={() => startEdit(entry)}>
                <Text fontSize={11} fill={COLORS.muted}>Редактировать</Text>
              </AutoLayout>
            </AutoLayout>
          )}
          <Line length="fill-parent" stroke={COLORS.subtle} strokeWidth={1} />
        </AutoLayout>
      ))}
      <AutoLayout name="Open history" width="fill-parent" horizontalAlignItems="center" padding={{ top: 13, bottom: 2 }}
        onClick={openHistory}>
        <Text fontSize={12} fontWeight="bold" fill={COLORS.accent} hoverStyle={{ fill: '#1856C3' }}>
          Вся история{all.length > recent.length ? ` · ещё ${all.length - recent.length}` : ''}
        </Text>
      </AutoLayout>
    </AutoLayout>
  );
}

widget.register(CoreonHistoryLog);
