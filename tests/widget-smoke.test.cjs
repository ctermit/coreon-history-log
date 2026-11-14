const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setupWidget(count) {
  const model = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/model.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/code.tsx'), 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.React, jsxFactory: 'figma.widget.h',
  } }).outputText;
  const records = new Map(Array.from({ length: count }, (_, i) => [`id-${i}`, {
    id: `id-${i}`, schemaVersion: 1, mode: 'product', kind: 'change', category: null,
    text: `Change ${i}`, authorId: 'author', authorName: 'Designer', createdAt: i,
    updatedAt: i,
  }]));
  const state = new Map();
  const activity = { uiMessages: [] };
  let registered;
  const ui = { onmessage: null, postMessage: message => activity.uiMessages.push(message), close: () => {} };
  const widget = {
    h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(x => x != null) }),
    AutoLayout: 'AutoLayout', Text: 'Text', Input: 'Input', Line: 'Line',
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
      showUI: () => {}, ui },
    __html__: '<html></html>', console,
  });
  vm.runInContext(`${model}\n${code}`, ctx);
  const render = () => registered();
  return { records, state, ui, activity, render };
}

function findAll(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(x => findAll(x, predicate));
  if (tree == null || typeof tree !== 'object') return [];
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.children || [], predicate)];
}

test('500 stored records render exactly five on-canvas entry groups', () => {
  const fake = setupWidget(500);
  const nodes = fake.render();
  assert.equal(findAll(nodes, x => x.props?.name === 'History entry').length, 5);
  assert.equal(findAll(nodes, x => x.type === 'Input').length, 5);
  assert.ok(findAll(nodes, x => x.type === 'AutoLayout').length < 30);
});

test('adding a record via modal preserves old 500 records', () => {
  const fake = setupWidget(500);
  const output = fake.render();
  const buttons = findAll(output, x => x.type === 'AutoLayout' && typeof x.props.onClick === 'function');
  buttons[0].props.onClick();
  fake.ui.onmessage({ type: 'ADD', text: 'Новый сценарий', kind: 'change', category: null });
  assert.equal(fake.records.size, 501);
  const newRecord = Array.from(fake.records.values()).find(r => r.text === 'Новый сценарий');
  assert.equal(newRecord.authorName, 'Алексей');
  assert.ok(fake.activity.uiMessages.some(message => message.type === 'SAVED'));
});

test('inline edit saves a single record and preserves creation metadata', () => {
  const fake = setupWidget(50);
  const input = findAll(fake.render(), x => x.type === 'Input')[0];
  const before = Array.from(fake.records.values()).find(r => r.text === input.props.value);
  input.props.onTextEditEnd({ characters: 'Отредактированный текст' });
  const after = fake.records.get(before.id);
  assert.equal(after.text, 'Отредактированный текст');
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(fake.records.size, 50);
});
