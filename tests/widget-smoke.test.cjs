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
    useSyncedMap: () => ({ entries: () => Array.from(records.entries()), get: id => records.get(id), set: (id, value) => records.set(id, value) }),
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

test('inline composer saves a Changed record without opening an iframe, preserves old records', () => {
  const f = setupWidget(20);
  named(f.render(), 'Toggle composer').props.onClick();
  assert.equal(f.state.get('composer-open-v2'), true);
  assert.equal(f.activity.opened.length, 0);
  let t = f.render();
  named(t, 'Новая запись').props.onTextEditEnd({ characters: 'Новая **запись**\n- пункт' });
  assert.equal(f.state.get('composer-draft-v2').includes('**'), true);
  t = f.render();
  named(t, 'Save composer').props.onClick();
  assert.equal(f.records.size, 21);
  const entry = [...f.records.values()].find(r => r.schemaVersion === 2);
  assert.equal(entry.authorName, 'Алексей');
  assert.equal(entry.category, 'changed');
  assert.equal(entry.text, 'Новая **запись**\n- пункт');
  assert.equal(f.state.get('composer-open-v2'), false);
});

test('can select Added/Fixed categories and create a separate handoff event', () => {
  const f = setupWidget();
  named(f.render(), 'Toggle composer').props.onClick();
  named(f.render(), 'Category fixed').props.onClick();
  named(f.render(), 'Новая запись').props.onTextEditEnd({ characters: 'Исправили отступы' });
  named(f.render(), 'Save composer').props.onClick();
  assert.equal([...f.records.values()][0].category, 'fixed');
  named(f.render(), 'Toggle composer').props.onClick();
  named(f.render(), 'Handoff').props.onClick();
  assert.equal([...f.records.values()].length, 2);
  assert.equal([...f.records.values()].filter(r => r.kind === 'handoff').length, 1);
});

test('saved Markdown renders as Figma Span rich text and clickable link', () => {
  const f = setupWidget(1);
  const t = f.render();
  const spans = findAll(t, x => x.type === 'Span');
  assert.ok(spans.some(x => x.props.fontWeight === 'bold'));
  assert.ok(spans.some(x => x.props.href === 'https://figma.com/file'));
  assert.ok(findAll(t, x => x.type === 'Text').some(x => x.children.some(c => typeof c === 'string' && c.includes('2026')) === false));
});

test('on-canvas inline editing works with Markdown and preserves timestamp', () => {
  const f = setupWidget(1);
  const old = f.records.get('id-0');
  named(f.render(), 'Edit on canvas').props.onClick();
  const t = f.render();
  named(t, 'Редактирование записи').props.onTextEditEnd({ characters: 'Обновлено **важное**' });
  named(f.render(), 'Save inline edit').props.onClick();
  const updated = f.records.get('id-0');
  assert.equal(updated.text, 'Обновлено **важное**');
  assert.equal(updated.createdAt, old.createdAt);
  assert.equal(f.records.size, 1);
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

test('formatting help can be opened in both composer and inline editor', () => {
  const f = setupWidget(1);
  named(f.render(), 'Toggle composer').props.onClick();
  const help = findAll(f.render(), n => n.type === 'AutoLayout' && n.children.some(c => c?.type === 'Text' && c.children.includes('? Форматирование')));
  assert.ok(help.length > 0);
  help[0].props.onClick();
  assert.ok(findAll(f.render(), n => n.props?.name === 'Formatting help').length > 0);
  named(f.render(), 'Edit on canvas').props.onClick();
  assert.ok(named(f.render(), 'Inline editor'));
});
