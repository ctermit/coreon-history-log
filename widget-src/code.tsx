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
      {shown.map((line, lineIndex) => (
        <Text key={lineIndex} width="fill-parent" fontSize={13} lineHeight={20} fill={COLORS.ink}>
          {line.prefix}
          {line.segments.map((segment, i) => segment.kind === 'bold' ? (
            <Span key={i} fontWeight="bold">{segment.text}</Span>
          ) : segment.kind === 'link' ? (
            <Span key={i} href={segment.href} fill={COLORS.accent} textDecoration="underline">{segment.text}</Span>
          ) : (
            <Span key={i}>{segment.text}</Span>
          ))}
        </Text>
      ))}
      {lines.length > MAX_CANVAS_LINES ? (
        <Text fontSize={11} fill={COLORS.muted}>Продолжение — во всей истории</Text>
      ) : null}
    </AutoLayout>
  );
}

function FormattingHelp() {
  return (
    <AutoLayout name="Formatting help" width="fill-parent" direction="vertical" spacing={4} padding={10}
      fill={COLORS.surface} cornerRadius={7}>
      <Text fontSize={11} fill={COLORS.ink}>**текст** — жирный</Text>
      <Text fontSize={11} fill={COLORS.ink}>[название](https://…) — ссылка</Text>
      <Text fontSize={11} fill={COLORS.ink}>https://… — ссылка автоматически</Text>
      <Text fontSize={11} fill={COLORS.ink}>- пункт — маркированный список</Text>
      <Text fontSize={11} fill={COLORS.ink}>1. пункт — нумерованный список</Text>
    </AutoLayout>
  );
}

function CoreonHistoryLog() {
  // Keep the original map key. v1 product and DS records remain untouched.
  const items = useSyncedMap<HistoryRecord>('history-records-v1');
  const [displayLimit, setDisplayLimit] = useSyncedState<number>('history-display-limit-v1', 5);
  const [composerOpen, setComposerOpen] = useSyncedState<boolean>('composer-open-v2', false);
  const [draft, setDraft] = useSyncedState<string>('composer-draft-v2', '');
  const [draftCategory, setDraftCategory] = useSyncedState<ChangeCategory>('composer-category-v2', 'changed');
  const [composerHelp, setComposerHelp] = useSyncedState<boolean>('composer-help-v2', false);
  const [editingId, setEditingId] = useSyncedState<string | null>('editing-id-v2', null);
  const [editingDraft, setEditingDraft] = useSyncedState<string>('editing-draft-v2', '');
  const [editingHelp, setEditingHelp] = useSyncedState<boolean>('editing-help-v2', false);
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

  function saveComposer() {
    if (!draft.trim()) return;
    writeRecord('change', draft, draftCategory);
    setDraft('');
    setDraftCategory('changed');
    setComposerOpen(false);
    setComposerHelp(false);
  }

  function markHandoff() {
    writeRecord('handoff', 'Передано', null);
    setDraft('');
    setDraftCategory('changed');
    setComposerOpen(false);
    setComposerHelp(false);
  }

  function startEdit(entry: HistoryRecord) {
    setEditingId(entry.id);
    setEditingDraft(entry.text);
    setEditingHelp(false);
  }

  function saveEdit(id: string) {
    const old = items.get(id);
    if (!old || !editingDraft.trim()) return;
    items.set(id, editHistoryRecord(old, editingDraft, Date.now()));
    setEditingId(null);
    setEditingDraft('');
    setEditingHelp(false);
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
        <AutoLayout name="Toggle composer" onClick={() => setComposerOpen(!composerOpen)}
          padding={{ horizontal: 11, vertical: 8 }} fill={COLORS.accent} cornerRadius={7}
          hoverStyle={{ fill: '#1856C3' }}>
          <Text fill={COLORS.white} fontSize={13} fontWeight="bold">{composerOpen ? 'Закрыть' : '+ Добавить'}</Text>
        </AutoLayout>
      </AutoLayout>

      {composerOpen ? (
        <AutoLayout name="Inline composer" direction="vertical" width="fill-parent" spacing={10}
          padding={12} fill={COLORS.surface} cornerRadius={8}>
          <Input name="Новая запись" value={draft} inputBehavior="multiline" width="fill-parent"
            fontSize={13} lineHeight={20} fill={COLORS.ink}
            placeholder="Что изменилось? Markdown поддерживается"
            placeholderProps={{ fill: COLORS.muted }}
            inputFrameProps={{ padding: 10, fill: COLORS.white, stroke: COLORS.subtle, cornerRadius: 7 }}
            onTextEditEnd={(event) => setDraft(event.characters.slice(0, MAX_TEXT_LENGTH))} />
          <AutoLayout direction="horizontal" width="fill-parent" spacing={6}>
            {(['changed', 'added', 'fixed'] as ChangeCategory[]).map((category) => (
              <AutoLayout key={category} name={`Category ${category}`} onClick={() => setDraftCategory(category)}
                padding={{ horizontal: 9, vertical: 6 }} cornerRadius={6}
                fill={draftCategory === category ? '#DBE8FF' : COLORS.white}
                stroke={draftCategory === category ? COLORS.accent : COLORS.subtle} strokeWidth={1}>
                <Text fontSize={11} fill={draftCategory === category ? COLORS.accent : COLORS.muted}
                  fontWeight={draftCategory === category ? 'bold' : 'normal'}>{categoryLabel(category)}</Text>
              </AutoLayout>
            ))}
          </AutoLayout>
          <AutoLayout onClick={() => setComposerHelp(!composerHelp)}>
            <Text fontSize={11} fill={COLORS.accent}>? Форматирование</Text>
          </AutoLayout>
          {composerHelp ? FormattingHelp() : null}
          <AutoLayout direction="horizontal" width="fill-parent" spacing={8} verticalAlignItems="center">
            <AutoLayout name="Handoff" onClick={markHandoff} padding={{ horizontal: 8, vertical: 8 }}>
              <Text fontSize={11} fill={COLORS.muted}>Передано</Text>
            </AutoLayout>
            <AutoLayout width="fill-parent" />
            <AutoLayout name="Cancel composer" onClick={() => { setComposerOpen(false); setDraft(''); setComposerHelp(false); }} padding={8}>
              <Text fontSize={12} fill={COLORS.muted}>Отмена</Text>
            </AutoLayout>
            <AutoLayout name="Save composer" onClick={saveComposer} padding={{ horizontal: 11, vertical: 8 }}
              fill={draft.trim() ? COLORS.accent : '#A4B9DB'} cornerRadius={7}>
              <Text fontSize={12} fontWeight="bold" fill={COLORS.white}>Сохранить</Text>
            </AutoLayout>
          </AutoLayout>
        </AutoLayout>
      ) : null}

      {recent.length === 0 ? (
        <AutoLayout width="fill-parent" fill={COLORS.surface} padding={20} cornerRadius={8}>
          <Text fontSize={13} fill={COLORS.muted}>Пока нет записей. Добавьте первую.</Text>
        </AutoLayout>
      ) : recent.map((entry) => (
        <AutoLayout key={entry.id} name="History entry" direction="vertical" width="fill-parent"
          spacing={7} padding={{ top: 11, bottom: 13 }}>
          <AutoLayout direction="horizontal" width="fill-parent" verticalAlignItems="center" spacing={8}>
            <Text fontWeight="bold" fontSize={12} fill={COLORS.ink}>{entry.authorName}</Text>
            <Text fontSize={11} fill={COLORS.muted}>{formatDateTime(entry.createdAt)}</Text>
            {entry.kind === 'handoff' ? (
              <Text fontSize={11} fill={COLORS.green} fontWeight="bold">Передано</Text>
            ) : (effectiveCategory(entry) !== 'changed' ? (
              <Text fontSize={11} fill={entry.category === 'added' ? COLORS.green : COLORS.amber} fontWeight="bold">
                {categoryLabel(effectiveCategory(entry))}
              </Text>
            ) : null)}
          </AutoLayout>
          {entry.kind === 'handoff' ? (
            <Text fontSize={13} fill={COLORS.ink}>{entry.text}</Text>
          ) : editingId === entry.id ? (
            <AutoLayout name="Inline editor" direction="vertical" width="fill-parent" spacing={8}>
              <Input name="Редактирование записи" value={editingDraft} inputBehavior="multiline"
                width="fill-parent" fontSize={13} lineHeight={20} fill={COLORS.ink}
                inputFrameProps={{ padding: 10, fill: COLORS.surface, stroke: COLORS.subtle, cornerRadius: 7 }}
                onTextEditEnd={(event) => setEditingDraft(event.characters.slice(0, MAX_TEXT_LENGTH))} />
              <AutoLayout onClick={() => setEditingHelp(!editingHelp)}><Text fontSize={11} fill={COLORS.accent}>? Форматирование</Text></AutoLayout>
              {editingHelp ? FormattingHelp() : null}
              <AutoLayout direction="horizontal" spacing={12}>
                <AutoLayout name="Save inline edit" onClick={() => saveEdit(entry.id)}>
                  <Text fontSize={12} fontWeight="bold" fill={COLORS.accent}>Сохранить</Text>
                </AutoLayout>
                <AutoLayout name="Cancel inline edit" onClick={() => setEditingId(null)}>
                  <Text fontSize={12} fill={COLORS.muted}>Отмена</Text>
                </AutoLayout>
              </AutoLayout>
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
