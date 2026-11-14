const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setupWidget(count = 0) {
  const model = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/model.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/code.tsx'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.React, jsxFactory: 'figma.widget.h' } }).outputText;
  const records = new Map(Array.from({ length: count }, (_, i) => [`id-${i}`, {
    id: `id-${i}`, schemaVersion: 1, mode: i % 2 ? 'ds' : 'product', kind: 'change', category: i % 2 ? 'added' : null,
    text: `Legacy **entry ${i}** with https://figma.com/file`, authorId: 'author', authorName: 'Designer',
    createdAt: i * 1000, updatedAt: i * 1000,
  }]));
  const state = new Map();
  const activity = { uiMessages: [], opened: [], closed: 0 };
  let registered;
  const ui = { onmessage: null, postMessage: message => activity.uiMessages.push(message), close: () => { activity.closed += 1; } };
  const widget = {
    h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(x => x != null) }),
    AutoLayout: 'AutoLayout', Text: 'Text', Span: 'Span', Input: 'Input', Line: 'Line',
    useSyncedMap: () => ({ entries: () => Array.from(records.entries()), get: id => records.get(id), set: (id, value) => records.set(id, value), delete: id => records.delete(id) }),
    useSyncedState: (key, initial) => {
      if (!state.has(key)) state.set(key, initial);
      return [state.get(key), value => state.set(key, value)];
    },
    usePropertyMenu: (options, handler) => { activity.propertyMenu = { options, handler }; },
    useEffect: callback => callback(),
    register: fn => { registered = fn; },
  };
  const ctx = vm.createContext({
    figma: { widget, currentUser: { id: 'user-now', name: 'Алексей' },
      showUI: (html, options) => { activity.opened.push({ html, options }); }, ui },
    __html__: '<html></html>', console,
  });
  vm.runInContext(`${model}\n${code}`, ctx);
  return { records, state, ui, activity, render: () => registered() };
}
function findAll(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(x => findAll(x, predicate));
  if (tree == null || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.children || [], predicate)];
}
function named(tree, name) {
  const found = findAll(tree, x => x.props?.name === name);
  assert.ok(found.length > 0, `not found: ${name}`);
  return found[0];
}

test('500 mixed v1 records render five (not 500), without dropping either old mode', () => {
  const f = setupWidget(500);
  const t = f.render();
  assert.equal(findAll(t, x => x.props?.name === 'History entry').length, 5);
  assert.ok(findAll(t, x => x.type === 'AutoLayout').length < 50);
  assert.equal(f.records.size, 500);
  assert.equal(f.state.has('history-mode-v1'), false, 'mode removed from UI');
});

test('inline composer auto-saves Changed on blur and closes with no separate Save/Close/Handoff controls', () => {
  const f = setupWidget(20);
  const add = named(f.render(), 'Toggle composer');
  assert.equal(add.children[0].children[0], '+ Добавить');
  add.props.onClick();
  assert.equal(f.state.get('composer-open-v2'), true);
  let t = f.render();
  assert.equal(findAll(t, x => x.props?.name === 'Save composer').length, 0);
  assert.equal(findAll(t, x => x.props?.name === 'Handoff').length, 0);
  assert.equal(findAll(t, x => x.props?.name === 'Category fixed').length, 0);
  assert.equal(f.activity.opened.length, 0);
  const input = named(t, 'Новая запись');
  input.props.onTextEditEnd({ characters: 'Новая **запись**\n- пункт' });
  input.props.onTextEditEnd({ characters: 'Новая **запись**\n- пункт' }); // double-event prevention
  assert.equal(f.records.size, 21);
  const entry = [...f.records.values()].find(r => r.schemaVersion === 2);
  assert.equal(entry.authorName, 'Алексей');
  assert.equal(entry.category, 'changed');
  assert.equal(entry.text, 'Новая **запись**\n- пункт');
  assert.equal(f.state.get('composer-open-v2'), false);
});

test('empty composer blur does not create a record or leave the composer open', () => {
  const f = setupWidget(1);
  named(f.render(), 'Toggle composer').props.onClick();
  named(f.render(), 'Новая запись').props.onTextEditEnd({ characters: '   ' });
  assert.equal(f.records.size, 1);
  assert.equal(f.state.get('composer-open-v2'), false);
});

test('hover category selector edits only target record and does not mutate existing v1 metadata', () => {
  const f = setupWidget(2);
  const t = f.render();
  assert.equal(findAll(t, x => x.props?.name === 'Category hover action').length, 2);
  const changed = f.records.get('id-0');
  const headers = findAll(t, x => x.props?.name === 'Category trigger');
  // Newest record is id-1. Open selector for id-0 (the older record).
  headers[1].props.onClick();
  assert.ok(named(f.render(), 'Category chooser'));
  named(f.render(), 'Choose category fixed').props.onClick();
  const updated = f.records.get('id-0');
  assert.equal(updated.category, 'fixed');
  assert.equal(updated.schemaVersion, 1);
  assert.equal(updated.createdAt, changed.createdAt);
  assert.equal(updated.authorName, changed.authorName);
  assert.equal(f.records.get('id-1').category, 'added');
  assert.equal(f.state.get('category-editor-id-v2'), null);
  // Return category to default; it should be hidden on the canvas.
  const header = findAll(f.render(), x => x.props?.name === 'Category trigger')[1];
  header.props.onClick();
  named(f.render(), 'Choose category changed').props.onClick();
  assert.equal(f.records.get('id-0').category, 'changed');
});

test('saved Markdown renders as Figma Span rich text and clickable link', () => {
  const f = setupWidget(1);
  const t = f.render();
  const spans = findAll(t, x => x.type === 'Span');
  assert.ok(spans.some(x => x.props.fontWeight === 'bold'));
  assert.ok(spans.some(x => x.props.href === 'https://figma.com/file'));
  assert.ok(findAll(t, x => x.type === 'Text').some(x => x.children.some(c => typeof c === 'string' && c.includes('2026')) === false));
});

test('on-canvas inline editing auto-saves Markdown on blur preserving creation metadata and avoiding no-op edits', () => {
  const f = setupWidget(1);
  const old = f.records.get('id-0');
  named(f.render(), 'Edit on canvas').props.onClick();
  let t = f.render();
  assert.equal(findAll(t, x => x.props?.name === 'Save inline edit').length, 0);
  const input = named(t, 'Редактирование записи');
  input.props.onTextEditEnd({ characters: 'Обновлено **важное**' });
  const updated = f.records.get('id-0');
  assert.equal(updated.text, 'Обновлено **важное**');
  assert.equal(updated.createdAt, old.createdAt);
  assert.equal(f.records.size, 1);
  assert.equal(f.state.get('editing-id-v2'), null);
  named(f.render(), 'Edit on canvas').props.onClick();
  t = f.render();
  named(t, 'Редактирование записи').props.onTextEditEnd({ characters: updated.text });
  assert.equal(f.records.get('id-0').updatedAt, updated.updatedAt);
});

test('blank edit and Escape-like unchanged text never erase an existing record', () => {
  const f = setupWidget(1);
  const before = f.records.get('id-0');
  named(f.render(), 'Edit on canvas').props.onClick();
  named(f.render(), 'Редактирование записи').props.onTextEditEnd({ characters: '    ' });
  assert.deepEqual(f.records.get('id-0'), before);
  named(f.render(), 'Edit on canvas').props.onClick();
  named(f.render(), 'Редактирование записи').props.onTextEditEnd({ characters: before.text });
  assert.deepEqual(f.records.get('id-0'), before);
});

test('full history opens a retained iframe and receives all unified records', async () => {
  const f = setupWidget(50);
  const lifetime = named(f.render(), 'Open history').props.onClick();
  assert.equal(typeof lifetime?.then, 'function');
  assert.equal(f.activity.opened.length, 1);
  f.ui.onmessage({ type: 'REQUEST_STATE' });
  const states = f.activity.uiMessages.filter(m => m.type === 'STATE');
  assert.equal(states.at(-1).records.length, 50);
  let settled = false;
  lifetime.then(() => settled = true);
  await Promise.resolve();
  assert.equal(settled, false);
  f.ui.onmessage({ type: 'CLOSE' });
  await lifetime;
  assert.equal(settled, true);
  assert.equal(f.activity.closed, 1);
});

test('formatting is a tooltip next to both composer and inline edit, not an expanded block', () => {
  const f = setupWidget(1);
  named(f.render(), 'Toggle composer').props.onClick();
  let t = f.render();
  const helps = findAll(t, n => n.props?.name === 'Formatting tooltip');
  assert.equal(helps.length, 1);
  assert.ok(helps[0].props.tooltip.includes('**текст**'));
  assert.equal(findAll(t, n => n.props?.name === 'Formatting help').length, 0);
  named(t, 'Edit on canvas').props.onClick();
  t = f.render();
  assert.ok(named(t, 'Inline editor'));
  assert.equal(findAll(t, n => n.props?.name === 'Formatting tooltip').length, 2);
});

test('full history DELETE removes only requested entry and refreshes UI snapshot', () => {
  const f = setupWidget(4);
  named(f.render(), 'Open history').props.onClick();
  f.ui.onmessage({ type: 'DELETE', id: 'id-2' });
  assert.equal(f.records.size, 3);
  assert.equal(f.records.has('id-2'), false);
  assert.equal(f.records.has('id-1'), true);
  assert.equal(f.records.has('id-3'), true);
  assert.equal(f.activity.uiMessages.some(m => m.type === 'DELETED' && m.id === 'id-2'), true);
  assert.equal(f.activity.uiMessages.filter(m => m.type === 'STATE').at(-1).records.length, 3);
  f.ui.onmessage({ type: 'DELETE', id: 'missing' });
  assert.equal(f.records.size, 3);
  assert.equal(f.activity.uiMessages.at(-1).type, 'ERROR');
});
