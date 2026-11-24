/** Detached FigLog migration experiment. Only ordinary Figma frames, never live widget data. */
type FiglogSkipped = { rowId: string; reason: string };
type FiglogPreview = {
  frameId: string;
  rowCount: number;
  entries: HistoryRecord[];
  skipped: FiglogSkipped[];
};
function parseFiglogTimestamp(raw: string): number | null {
  const match = raw.trim().match(/^(?:EDITED\s+)?(\d{1,2})\s*[|/.]\s*(\d{1,2})\s*[|/.]\s*(\d{2,4})\s*@\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  const month = Number(match[1]), day = Number(match[2]);
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  let hour = Number(match[4]);
  const minute = Number(match[5]), ampm = match[6]?.toUpperCase();
  if (ampm) {
    if (hour < 1 || hour > 12) return null;
    hour = hour % 12 + (ampm === 'PM' ? 12 : 0);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
      date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date.getTime();
}
function extractFiglogFrame(frame: FrameNode): FiglogPreview {
  const rows = frame.findAll((node) => node.type === 'FRAME' && node.name === 'ChangeLogRow') as FrameNode[];
  if (rows.length === 0 || rows.length > 2000) throw new Error('Ожидался разбитый FigLog (от 1 до 2000 записей)');
  const entries: HistoryRecord[] = [];
  const skipped: FiglogSkipped[] = [];
  for (const row of rows) {
    const texts = row.findAll((node) => node.type === 'TEXT') as TextNode[];
    const isVisible = (node: SceneNode): boolean => {
      let current: SceneNode | null = node;
      while (current && current !== row) {
        if (!current.visible) return false;
        current = current.parent as SceneNode | null;
      }
      return row.visible;
    };
    const field = (name: string): string => (texts.find((node) =>
      node.name === name && isVisible(node) && node.characters.trim().length > 0)?.characters || '').trim();
    const content = texts.filter((node) => node.name === 'EditableChange' && isVisible(node) &&
      node.characters.trim() && node.characters.trim() !== 'Your update...');
    if (content.length === 0) {
      skipped.push({ rowId: row.id, reason: 'Пустой черновик' });
      continue;
    }
    if (content.length !== 1) {
      skipped.push({ rowId: row.id, reason: 'Неоднозначное содержимое записи' });
      continue;
    }
    const text = content[0].characters.trim();
    if (text.length > MAX_TEXT_LENGTH) {
      skipped.push({ rowId: row.id, reason: 'Текст длиннее 5000 символов' });
      continue;
    }
    const authorName = field('Date') || field('UserName');
    const createdLabel = field('Created');
    const editedLabel = field('Edited');
    const createdAt = parseFiglogTimestamp(createdLabel);
    const updatedAt = editedLabel ? parseFiglogTimestamp(editedLabel) : createdAt;
    if (!authorName || createdAt === null || updatedAt === null) {
      skipped.push({ rowId: row.id, reason: 'Не удалось определить автора или дату' });
      continue;
    }
    // FigLog link URLs live in click handlers and are not exported into ordinary text layers.
    if (row.findAll((node) => node.name === 'Links').length > 0) {
      skipped.push({ rowId: row.id, reason: 'Есть ссылки, адреса которых не сохранились при разбивке' });
      continue;
    }
    const typeText = field('Type').toLowerCase();
    let category: ChangeCategory;
    if (!typeText || typeText === 'log type' || typeText === 'none' || typeText === 'changed') category = 'changed';
    else if (typeText === 'added') category = 'added';
    else if (typeText === 'fixed') category = 'fixed';
    else {
      skipped.push({ rowId: row.id, reason: 'Неподдерживаемый тип: ' + typeText });
      continue;
    }
    entries.push({
      id: 'figlog-' + frame.id.replace(/[^0-9a-z]/gi, '_') + '-' + row.id.replace(/[^0-9a-z]/gi, '_'),
      schemaVersion: 2,
      kind: 'change',
      category,
      text,
      authorId: null,
      authorName,
      createdAt,
      updatedAt,
      importedFrom: { app: 'FigLog', frameId: frame.id, rowId: row.id, createdLabel, editedLabel: editedLabel || null },
    });
  }
  return { frameId: frame.id, rowCount: rows.length, entries, skipped };
}
