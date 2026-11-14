const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../widget-src/model.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
const api = vm.runInNewContext(`${compiled}\n({ cleanText, validateChange, recordsForMode, visibleRecords, createHistoryRecord, editHistoryRecord })`);
const author = { id: 'user', name: 'Designer' };
const product = (n) => api.createHistoryRecord({ mode: 'product', kind: 'change', text: `Изменение ${n}`, category: null }, author, n, String(n));

test('adds author, time and trims content', () => {
  const record = api.createHistoryRecord({ mode: 'product', kind: 'change', text: '  Обновлены кнопки   ', category: null }, author, 1234, 'abc');
  assert.equal(record.text, 'Обновлены кнопки');
  assert.equal(record.authorName, 'Designer');
  assert.equal(record.createdAt, 1234);
  assert.equal(record.category, null);
});

test('DS requires category; handoff is separate and DS-only', () => {
  assert.throws(() => api.createHistoryRecord({ mode: 'ds', kind: 'change', text: 'Иконки', category: null }, author, 1, 'a'));
  const milestone = api.createHistoryRecord({ mode: 'ds', kind: 'handoff', text: '', category: 'added' }, author, 2, 'b');
  assert.equal(milestone.kind, 'handoff');
  assert.equal(milestone.category, null);
  assert.equal(milestone.text, 'Передано');
  assert.throws(() => api.createHistoryRecord({ mode: 'product', kind: 'handoff', text: '', category: null }, author, 3, 'c'));
});

test('only the configured number of records renders on canvas', () => {
  const all = Array.from({ length: 500 }, (_, i) => product(i));
  assert.equal(api.visibleRecords(all, 'product', 5).length, 5);
  assert.equal(api.visibleRecords(all, 'product', 5)[0].createdAt, 499);
  assert.equal(api.visibleRecords(all, 'product', 15).length, 15);
  assert.equal(api.visibleRecords(all, 'product', 999).length, 5);
});

test('editing preserves original author and created timestamp', () => {
  const before = product(3);
  const edited = api.editHistoryRecord(before, 'Новая редакция', 100);
  assert.equal(edited.createdAt, before.createdAt);
  assert.equal(edited.authorId, before.authorId);
  assert.equal(edited.text, 'Новая редакция');
  assert.equal(edited.updatedAt, 100);
  assert.throws(() => api.editHistoryRecord(before, '  ', 200));
});

test('10000 records are sorted without data loss', () => {
  const all = Array.from({ length: 10000 }, (_, i) => product(i));
  const found = api.recordsForMode(all, 'product');
  assert.equal(found.length, 10000);
  assert.equal(found[0].createdAt, 9999);
  assert.equal(found.at(-1).createdAt, 0);
});
