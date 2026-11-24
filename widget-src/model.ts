/** Pure record operations. Old v1 data remains in the same synced map. */
type LogMode = 'product' | 'ds'; // legacy records only
type ChangeCategory = 'added' | 'changed' | 'fixed';
type LogKind = 'change' | 'handoff';

interface HistoryRecord {
  schemaVersion: 1 | 2;
  id: string;
  /** Historical v1 mode is preserved, but all records now share one timeline. */
  mode?: LogMode;
  kind: LogKind;
  category: ChangeCategory | null;
  text: string;
  authorId: string | null;
  authorName: string;
  createdAt: number;
  updatedAt: number;
}

type MarkdownSegment =
  | { kind: 'text' | 'bold'; text: string }
  | { kind: 'link'; text: string; href: string };
interface MarkdownLine {
  prefix: string;
  segments: MarkdownSegment[];
}

const MAX_TEXT_LENGTH = 5000;
const LIMIT_OPTIONS = [3, 5, 10, 15];
const MAX_CANVAS_LINES = 18;

function cleanText(value: string): string {
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function validateChange(text: string): string | null {
  return cleanText(text) ? null : 'Добавьте описание изменений';
}

function byNewest(records: HistoryRecord[]): HistoryRecord[] {
  return records.sort((a, b) => (b.createdAt - a.createdAt) || b.id.localeCompare(a.id));
}

function recordsForHistory(records: HistoryRecord[]): HistoryRecord[] {
  return byNewest(records.slice());
}

function visibleRecords(records: HistoryRecord[], limit: number): HistoryRecord[] {
  return recordsForHistory(records).slice(0, LIMIT_OPTIONS.includes(limit) ? limit : 5);
}

function effectiveCategory(record: HistoryRecord): ChangeCategory | null {
  return record.kind === 'handoff' ? null : (record.category || 'changed');
}

function createHistoryRecord(
  params: { kind: LogKind; text: string; category?: ChangeCategory | null },
  author: { id: string | null; name: string },
  now: number,
  nonce: string,
): HistoryRecord {
  const isHandoff = params.kind === 'handoff';
  const cleaned = cleanText(params.text);
  if (!isHandoff) {
    const error = validateChange(cleaned);
    if (error) throw new Error(error);
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

function formatDateTime(timestamp: number): string {
  // Figma's widget runtime may ignore Intl formatting options such as hour12.
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Deliberately small Markdown subset: bold, HTTP(S) links and lists.
 * Text is never interpreted as HTML; other syntax remains literal. */
function parseMarkdown(text: string): MarkdownLine[] {
  return text.replace(/\r\n?/g, '\n').split('\n').map((raw) => {
    let prefix = '';
    let line = raw;
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (bullet) { prefix = '• '; line = bullet[1]; }
    else if (numbered) { prefix = `${numbered[1]}. `; line = numbered[2]; }

    const segments: MarkdownSegment[] = [];
    const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<>)]+)/gi;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      if (match.index > cursor) segments.push({ kind: 'text', text: line.slice(cursor, match.index) });
      if (match[1] && match[2]) {
        segments.push({ kind: 'link', text: match[1], href: match[2] });
      } else if (match[3]) {
        segments.push({ kind: 'bold', text: match[3] });
      } else if (match[4]) {
        const href = match[4].replace(/[.,;!?]+$/, '');
        if (href) segments.push({ kind: 'link', text: href, href });
        if (href.length < match[4].length) segments.push({ kind: 'text', text: match[4].slice(href.length) });
      }
      cursor = pattern.lastIndex;
    }
    if (cursor < line.length) segments.push({ kind: 'text', text: line.slice(cursor) });
    if (segments.length === 0) segments.push({ kind: 'text', text: line || ' ' });
    return { prefix, segments };
  });
}
