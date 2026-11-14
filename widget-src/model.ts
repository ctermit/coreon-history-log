/** Pure record operations. Keep this file free of Figma APIs to enable offline testing. */
type LogMode = 'product' | 'ds';
type ChangeCategory = 'added' | 'changed' | 'fixed';
type LogKind = 'change' | 'handoff';

interface HistoryRecord {
  schemaVersion: 1;
  id: string;
  mode: LogMode;
  kind: LogKind;
  category: ChangeCategory | null;
  text: string;
  authorId: string | null;
  authorName: string;
  createdAt: number;
  updatedAt: number;
}

const MAX_TEXT_LENGTH = 5000;
const LIMIT_OPTIONS = [3, 5, 10, 15];

function cleanText(value: string): string {
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function validateChange(mode: LogMode, text: string, category: ChangeCategory | null): string | null {
  if (!cleanText(text)) return 'Добавьте описание изменений';
  if (mode === 'ds' && !category) return 'Выберите категорию изменения';
  return null;
}

function byNewest(records: HistoryRecord[]): HistoryRecord[] {
  return records.sort((a, b) => (b.createdAt - a.createdAt) || b.id.localeCompare(a.id));
}

function recordsForMode(records: HistoryRecord[], mode: LogMode): HistoryRecord[] {
  return byNewest(records.filter((entry) => entry.mode === mode));
}

function visibleRecords(records: HistoryRecord[], mode: LogMode, limit: number): HistoryRecord[] {
  return recordsForMode(records, mode).slice(0, LIMIT_OPTIONS.includes(limit) ? limit : 5);
}

function createHistoryRecord(
  params: { mode: LogMode; kind: LogKind; text: string; category: ChangeCategory | null },
  author: { id: string | null; name: string },
  now: number,
  nonce: string,
): HistoryRecord {
  const isHandoff = params.kind === 'handoff';
  if (isHandoff && params.mode !== 'ds') throw new Error('Передача доступна только для дизайн-системы');
  const cleaned = cleanText(params.text);
  if (!isHandoff) {
    const error = validateChange(params.mode, cleaned, params.category);
    if (error) throw new Error(error);
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

function editHistoryRecord(previous: HistoryRecord, newText: string, now: number): HistoryRecord {
  const value = cleanText(newText);
  if (!value) throw new Error('Текст записи не может быть пустым');
  return { ...previous, text: value, updatedAt: now };
}

function categoryLabel(category: ChangeCategory | null): string {
  if (category === 'added') return 'Added';
  if (category === 'changed') return 'Changed';
  if (category === 'fixed') return 'Fixed';
  return '';
}
