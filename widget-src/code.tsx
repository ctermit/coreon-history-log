/** Coreon History Log widget. Rendering only depends on synchronized widget state. */
const { widget } = figma;
const { AutoLayout, Text, Input, Line, useSyncedMap, useSyncedState, usePropertyMenu, useEffect } = widget;

declare const __html__: string;

const COLORS = {
  ink: '#1B1E23', muted: '#6D7280', subtle: '#E7E9EE', white: '#FFFFFF',
  surface: '#F7F8FA', accent: '#2369E8', green: '#237A54', amber: '#946200',
};

let currentPanel: 'add' | 'history' | null = null;

function CoreonHistoryLog() {
  const items = useSyncedMap<HistoryRecord>('history-records-v1');
  const [mode, setMode] = useSyncedState<LogMode>('history-mode-v1', 'product');
  const [displayLimit, setDisplayLimit] = useSyncedState<number>('history-display-limit-v1', 5);
  const all = items.entries().map(([id, item]) => ({ ...item, id }));
  const current = recordsForMode(all, mode);
  const recent = current.slice(0, LIMIT_OPTIONS.includes(displayLimit) ? displayLimit : 5);

  function snapshot() {
    return { type: 'STATE', mode, records: recordsForMode(items.entries().map(([id, r]) => ({ ...r, id })), mode) };
  }

  function present(panel: 'add' | 'history') {
    currentPanel = panel;
    figma.showUI(__html__, { width: 440, height: panel === 'add' ? 390 : 580, title: 'Coreon History Log', themeColors: true });
    figma.ui.postMessage({ ...snapshot(), panel });
  }

  function saveNew(message: { kind?: LogKind; text?: string; category?: ChangeCategory | null }) {
    const author = figma.currentUser;
    const timestamp = Date.now();
    const kind: LogKind = message.kind === 'handoff' ? 'handoff' : 'change';
    const entry = createHistoryRecord(
      { mode, kind, text: message.text || '', category: message.category || null },
      { id: author?.id || null, name: author?.name || 'Дизайнер' },
      timestamp,
      Math.random().toString(36).slice(2, 12),
    );
    items.set(entry.id, entry);
    return entry;
  }

  useEffect(() => {
    figma.ui.onmessage = (message: {
      type: string; kind?: LogKind; text?: string; category?: ChangeCategory | null;
      id?: string; newText?: string;
    }) => {
      try {
        if (message.type === 'ADD') {
          saveNew(message);
          figma.ui.postMessage({ type: 'SAVED' });
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'EDIT' && typeof message.id === 'string') {
          const previous = items.get(message.id);
          if (!previous || previous.mode !== mode) throw new Error('Запись не найдена');
          items.set(message.id, editHistoryRecord(previous, message.newText || '', Date.now()));
          figma.ui.postMessage({ type: 'SAVED' });
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'REQUEST_STATE') {
          figma.ui.postMessage(snapshot());
        } else if (message.type === 'CLOSE') {
          currentPanel = null;
          figma.ui.close();
        }
      } catch (error) {
        figma.ui.postMessage({ type: 'ERROR', message: error instanceof Error ? error.message : 'Не удалось сохранить запись' });
      }
    };
    if (currentPanel) figma.ui.postMessage(snapshot());
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

  return (
    <AutoLayout name="Coreon History Log" direction="vertical" width={410} spacing={0}
      padding={16} fill={COLORS.white} cornerRadius={12} stroke={COLORS.subtle} strokeWidth={1}>
      <AutoLayout direction="horizontal" width="fill-parent" verticalAlignItems="center" spacing={10} padding={{ bottom: 13 }}>
        <AutoLayout direction="vertical" spacing={4} width="fill-parent">
          <Text fontSize={17} fontWeight="bold" fill={COLORS.ink}>История изменений</Text>
          <Text fontSize={11} fill={COLORS.muted}>{mode === 'product' ? 'Макеты' : 'Дизайн-система'} · {current.length} записей</Text>
        </AutoLayout>
        <AutoLayout onClick={() => present('add')} padding={{ horizontal: 11, vertical: 8 }}
          fill={COLORS.accent} cornerRadius={7} hoverStyle={{ fill: '#1856C3' }}>
          <Text fill={COLORS.white} fontSize={13} fontWeight="bold">+ Добавить</Text>
        </AutoLayout>
      </AutoLayout>
      {recent.length === 0 ? (
        <AutoLayout width="fill-parent" fill={COLORS.surface} padding={20} cornerRadius={8}>
          <Text fontSize={13} fill={COLORS.muted}>Пока нет записей. Добавьте первую.</Text>
        </AutoLayout>
      ) : recent.map((entry) => (
        <AutoLayout key={entry.id} name="History entry" direction="vertical" width="fill-parent"
          spacing={6} padding={{ top: 11, bottom: 13 }}>
          <AutoLayout direction="horizontal" width="fill-parent" verticalAlignItems="center" spacing={8}>
            <Text fontWeight="bold" fontSize={12} fill={COLORS.ink}>{entry.authorName}</Text>
            <Text fontSize={11} fill={COLORS.muted}>{new Date(entry.createdAt).toLocaleDateString('ru-RU')}</Text>
            {entry.kind === 'handoff' ? (
              <Text fontSize={11} fill={COLORS.green} fontWeight="bold">Передано</Text>
            ) : (entry.mode === 'ds' && entry.category ? (
              <Text fontSize={11} fill={entry.category === 'added' ? COLORS.green : entry.category === 'changed' ? COLORS.amber : COLORS.muted}>
                {categoryLabel(entry.category)}
              </Text>
            ) : null)}
          </AutoLayout>
          {entry.kind === 'handoff' ? (
            <Text fontSize={13} fill={COLORS.ink}>{entry.text}</Text>
          ) : (
            <Input name="Изменить запись" value={entry.text} inputBehavior="multiline"
              width="fill-parent" fontSize={13} lineHeight={20} fill={COLORS.ink}
              inputFrameProps={{ padding: 0, fill: COLORS.white }}
              onTextEditEnd={(event) => {
                const latest = items.get(entry.id);
                if (latest && event.characters.trim() && latest.text !== event.characters.trim()) {
                  items.set(entry.id, editHistoryRecord(latest, event.characters, Date.now()));
                }
              }}/>
          )}
          <Line length="fill-parent" stroke={COLORS.subtle} strokeWidth={1} />
        </AutoLayout>
      ))}
      <AutoLayout width="fill-parent" horizontalAlignItems="center" padding={{ top: 13, bottom: 2 }}
        onClick={() => present('history')}>
        <Text fontSize={12} fontWeight="bold" fill={COLORS.accent} hoverStyle={{ fill: '#1856C3' }}>
          Вся история{current.length > recent.length ? ` · ещё ${current.length - recent.length}` : ''}
        </Text>
      </AutoLayout>
    </AutoLayout>
  );
}

widget.register(CoreonHistoryLog);
