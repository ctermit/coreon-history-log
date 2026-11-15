const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../widget-src/model.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
const api = vm.runInNewContext(`${compiled}\n({ validateChange, recordsForHistory, visibleRecords, createHistoryRecord, editHistoryRecord, effectiveCategory, parseMarkdown, formatDateTime })`);
const author = { id: 'a-01', name: 'Designer' };
const create = (i, category = 'changed') => api.createHistoryRecord({ kind: 'change', text: `Изменение ${i}`, category }, author, i * 100, String(i));

test('new entries have a unified v2 schema and Changed default', () => {
  const rec = api.createHistoryRecord({ kind: 'change', text: '  Новая карточка  ' }, author, 100, 'a');
  assert.equal(rec.schemaVersion, 2);
  assert.equal(rec.mode, undefined);
  assert.equal(rec.text, 'Новая карточка');
  assert.equal(rec.category, 'changed');
  assert.equal(rec.createdAt, 100);
  assert.equal(rec.authorName, 'Designer');
});

test('existing product and DS entries remain in one history, including legacy null category', () => {
  const product = { ...create(1), schemaVersion: 1, mode: 'product', category: null };
  const ds = { ...create(2), schemaVersion: 1, mode: 'ds', category: 'fixed' };
  const all = api.recordsForHistory([product, ds, create(3)]);
  assert.equal(all.length, 3);
  assert.equal(all[0].createdAt, 300);
  assert.equal(all[1].mode, 'ds');
  assert.equal(all[2].mode, 'product');
  assert.equal(api.effectiveCategory(product), 'changed');
  assert.equal(api.effectiveCategory(ds), 'fixed');
});

test('handoff is mode-independent and separate from category', () => {
  const rec = api.createHistoryRecord({ kind: 'handoff', text: '' }, author, 1, 'x');
  assert.equal(rec.text, 'Передано');
  assert.equal(rec.category, null);
  assert.equal(api.effectiveCategory(rec), null);
  assert.ok(api.validateChange(' ') != null);
});

test('only configured record count renders on canvas and 500 remain stored', () => {
  const all = Array.from({ length: 500 }, (_, i) => create(i));
  assert.equal(api.visibleRecords(all, 5).length, 5);
  assert.equal(api.visibleRecords(all, 15).length, 15);
  assert.equal(api.visibleRecords(all, 999).length, 5);
  assert.equal(all.length, 500);
});

test('editing preserves original author, timestamp, mode and category', () => {
  const before = { ...create(4, 'fixed'), schemaVersion: 1, mode: 'ds' };
  const updated = api.editHistoryRecord(before, '**Исправлено**', 5000);
  assert.equal(updated.text, '**Исправлено**');
  assert.equal(updated.mode, 'ds');
  assert.equal(updated.createdAt, before.createdAt);
  assert.equal(updated.updatedAt, 5000);
  assert.equal(updated.authorId, 'a-01');
  assert.equal(updated.category, 'fixed');
  assert.throws(() => api.editHistoryRecord(before, ' ', 5000));
});

test('Markdown: bold, explicit links, autolinks and lists', () => {
  const lines = api.parseMarkdown('Текст **важно** [Figma](https://figma.com/file/12)\n- Исправили **кнопку**\n1. Затем https://example.org/path.');
  assert.equal(lines.length, 3);
  assert.equal(lines[1].prefix, '• ');
  assert.equal(lines[2].prefix, '1. ');
  assert.ok(lines[0].segments.some(x => x.kind === 'bold' && x.text === 'важно'));
  assert.ok(lines[0].segments.some(x => x.kind === 'link' && x.href === 'https://figma.com/file/12'));
  assert.ok(lines[2].segments.some(x => x.kind === 'link' && x.href === 'https://example.org/path'));
});

test('Markdown: HTML and javascript URLs remain inert text', () => {
  const lines = api.parseMarkdown('<img src=x onerror=alert(1)> [bad](javascript:alert(1))');
  assert.equal(lines[0].segments.filter(s => s.kind === 'link').length, 0);
  assert.ok(lines[0].segments.some(s => s.kind === 'text' && s.text.includes('javascript:')));
});

test('date/time includes hours and minutes (locale-aware)', () => {
  const text = api.formatDateTime(new Date('2026-11-15T10:35:22Z').getTime());
  assert.match(text, /2026/);
  assert.match(text, /\d{2}:\d{2}/);
  assert.doesNotMatch(text, /,/);
  assert.match(text, /\d{2}\.\d{2}\.2026 \d{2}:\d{2}/);
});
