/** Coreon History Log — unified timeline, inline composer, basic Markdown. */
const { widget } = figma;
const { AutoLayout, Text, Span, Input, SVG, Line, useSyncedMap, useSyncedState, usePropertyMenu, useEffect } = widget;

const COLORS = {
  ink: '#1B1E23', muted: '#6D7280', subtle: '#E7E9EE', white: '#FFFFFF',
  surface: '#F7F8FA', accent: '#2369E8', green: '#237A54', amber: '#946200',
};

let resolveOpenPanel: (() => void) | null = null;
let panelOpen = false;
let figlogPreview: FiglogPreview | null = null;
let figlogBusy = false;

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
  return (
    <SVG name="Coreon formatting help" src={COREON_HELP_SVG} width={20} height={20}
      tooltip={FORMATTING_TOOLTIP} />
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
      figma.showUI(__html__, { width: 490, height: 630, title: 'Design History Log', themeColors: true });
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
    if (composerCommitted) return;
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
    figma.ui.onmessage = (message: { type: string; id?: string; newText?: string; frameId?: string }) => {
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
        } else if (message.type === 'FIGLOG_PREVIEW' && typeof message.frameId === 'string') {
          if (figlogBusy) return;
          figlogBusy = true;
          figlogPreview = null;
          void (async () => {
            try {
              const node = await figma.getNodeByIdAsync(message.frameId!);
              if (!node || node.type !== 'FRAME') throw new Error('Фрейм не найден в текущем файле');
              const parsed = extractFiglogFrame(node);
              figlogPreview = parsed;
              figma.ui.postMessage({
                type: 'FIGLOG_PREVIEW_RESULT',
                frameId: parsed.frameId,
                rowCount: parsed.rowCount,
                ready: parsed.entries.filter((item) => !items.get(item.id)).length,
                duplicates: parsed.entries.filter((item) => !!items.get(item.id)).length,
                skipped: parsed.skipped,
                examples: parsed.entries.slice(0, 10).map((item) => ({
                  id: item.id, author: item.authorName, text: item.text,
                  createdLabel: item.importedFrom?.createdLabel || '', category: item.category,
                })),
              });
            } catch (err) {
              figma.ui.postMessage({ type: 'FIGLOG_ERROR', message: err instanceof Error ? err.message : 'Не удалось прочитать FigLog' });
            } finally {
              figlogBusy = false;
            }
          })();
        } else if (message.type === 'FIGLOG_IMPORT') {
          if (!figlogPreview || figlogBusy) throw new Error('Сначала проверьте источник');
          figlogBusy = true;
          const preview = figlogPreview;
          figlogPreview = null;
          try {
            let added = 0, duplicates = 0;
            for (const entry of preview.entries) {
              if (items.get(entry.id)) { duplicates += 1; continue; }
              items.set(entry.id, entry);
              added += 1;
            }
            figma.ui.postMessage({ type: 'FIGLOG_IMPORTED', added, duplicates, skipped: preview.skipped.length });
            figma.ui.postMessage(snapshot());
          } finally {
            figlogBusy = false;
          }
        } else if (message.type === 'REQUEST_STATE') {
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'CLOSE') {
          panelOpen = false;
          figlogPreview = null;
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
    <AutoLayout name="Design History Log" direction="vertical" width={410} spacing={0}
      padding={16} fill={COLORS.white} cornerRadius={12} stroke={COLORS.subtle} strokeWidth={1}>
      <AutoLayout name="Header" direction="horizontal" width="fill-parent" verticalAlignItems="center" spacing={10} padding={{ bottom: 10 }}>
        <AutoLayout direction="vertical" spacing={4} width="fill-parent">
          <Text fontSize={17} fontWeight="bold" fill={COLORS.ink}>Design History Log</Text>
          <Text fontSize={11} fill={COLORS.muted}>{all.length} записей</Text>
        </AutoLayout>
        {FormattingHint()}
      </AutoLayout>

      <AutoLayout name="Inline composer" direction="vertical" width="fill-parent" spacing={0} padding={{ bottom: 8 }}>
          <Input name="Новая запись" value={draft} inputBehavior="multiline" width="fill-parent"
            fontSize={13} lineHeight={20} fill={COLORS.ink}
            placeholder="Что изменилось?"
            placeholderProps={{ fill: COLORS.muted }}
            inputFrameProps={{ padding: { horizontal: 10, vertical: 8 }, fill: '#F4F5F7', cornerRadius: 6 }}
            onTextEditEnd={(event) => commitComposer(event.characters)} />
      </AutoLayout>

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
              <Text fontFamily="JetBrains Mono" fontSize={11} fill={COLORS.muted}>{formatDateTime(entry.createdAt)}</Text>
              <Text fontSize={11} fill={COLORS.green} fontWeight="bold">Передано</Text>
            </AutoLayout>
          ) : (
            <AutoLayout name="Category trigger" direction="horizontal" width="fill-parent" verticalAlignItems="center"
              spacing={8} onClick={() => setCategoryEditorId(categoryEditorId === entry.id ? null : entry.id)}>
              <Text fontWeight="bold" fontSize={12} fill={COLORS.ink}>{entry.authorName}</Text>
              <Text fontFamily="JetBrains Mono" fontSize={11} fill={COLORS.muted}>{formatDateTime(entry.createdAt)}</Text>
              <AutoLayout width="fill-parent" height={1} />
              <Text name="Category hover action" fontSize={11}
                fill={effectiveCategory(entry) === 'added' ? COLORS.green : effectiveCategory(entry) === 'fixed' ? COLORS.amber : COLORS.accent}
                opacity={effectiveCategory(entry) === 'changed' ? 0 : 1} hoverStyle={{ opacity: 1 }}
                tooltip="Изменить категорию">
                {effectiveCategory(entry) === 'changed' ? '+ Кат.' : categoryLabel(effectiveCategory(entry))}
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
            <Input name="Редактирование записи" value={editingDraft} inputBehavior="multiline"
              width="fill-parent" fontSize={13} lineHeight={20} fill={COLORS.ink}
              inputFrameProps={{ padding: { horizontal: 10, vertical: 8 }, fill: '#F4F5F7', cornerRadius: 6 }}
              onTextEditEnd={(event) => commitEdit(entry.id, event.characters)} />
          ) : (
            <AutoLayout name="Entry hover editing" direction="horizontal" width="fill-parent"
              spacing={4} verticalAlignItems="start"
              onClick={() => startEdit(entry)}>
              <AutoLayout name="Entry formatted content" width="fill-parent" direction="vertical">
                {MarkdownText({ source: entry.text })}
              </AutoLayout>
              <AutoLayout name="Pencil slot" width={24} height={24}
                verticalAlignItems="center" horizontalAlignItems="center">
                <SVG name="Pencil hover glyph" src={PENCIL_SVG} width={16} height={16}
                  opacity={0} hoverStyle={{ opacity: 1 }} />
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
