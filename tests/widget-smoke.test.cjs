const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setupWidget(count = 0) {
  const model = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/model.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  const importer = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/figlog-import.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2019 } }).outputText;
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../widget-src/code.tsx'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.React, jsxFactory: 'figma.widget.h' } }).outputText;
  const records = new Map(Array.from({ length: count }, (_, i) => [`id-${i}`, {
    id: `id-${i}`, schemaVersion: 1, mode: i % 2 ? 'ds' : 'product', kind: 'change', category: i % 2 ? 'added' : null,
    text: `Legacy **entry ${i}** with https://figma.com/file`, authorId: 'author', authorName: 'Designer',
    createdAt: i * 1000, updatedAt: i * 1000,
  }]));
  const state = new Map();
  const externalNodes = new Map();
  const activity = { uiMessages: [], opened: [], closed: 0 };
  let registered;
  const ui = { onmessage: null, postMessage: message => activity.uiMessages.push(message), close: () => { activity.closed += 1; } };
  const widget = {
    h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(x => x != null) }),
    AutoLayout: 'AutoLayout', Text: 'Text', Span: 'Span', Input: 'Input', SVG: 'SVG', Line: 'Line',
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
      getNodeByIdAsync: async id => externalNodes.get(id) || null,
      showUI: (html, options) => { activity.opened.push({ html, options }); }, ui },
    __html__: '<html></html>', console,
  });
  vm.runInContext(`${model}\n${importer}\n${code}`, ctx);
  return { records, state, ui, activity, externalNodes, render: () => registered() };
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
  assert.equal(findAll(f.render(), x => x.props?.name === 'Toggle composer').length, 0);
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

test('full entry body click activates pencil-backed editing and saves safely', () => {
  const f=setupWidget(1);
  const old=f.records.get('id-0');
  let t=f.render();
  const glyph=named(t,'Pencil hover glyph');
  const hoverRegion=named(t,'Entry hover editing');
  assert.equal(glyph.props.opacity, 0);
  assert.equal(glyph.props.hoverStyle.opacity, 1);
  assert.equal(typeof named(t,'Entry hover editing').props.onClick,'function');
  assert.equal(typeof hoverRegion.props.onClick,'function');
  assert.equal(f.state.get('editing-id-v2'), null);
  hoverRegion.props.onClick({offsetX: 40, offsetY: 8});
  assert.equal(f.state.get('editing-id-v2'), 'id-0', 'clicking the text body must activate editing');
  assert.equal(findAll(t,n => n.props?.name==='Edit on canvas').length, 0);
  t=f.render();
  const input=named(t,'Редактирование записи');
  assert.ok(input);
  assert.equal(findAll(t,n=> n.props?.name==='Inline editor').length,0);
  input.props.onTextEditEnd({characters:'Обновлено **важное**'});
  assert.equal(f.records.get('id-0').text,'Обновлено **важное**');
  assert.equal(f.records.get('id-0').createdAt,old.createdAt);
  assert.equal(f.state.get('editing-id-v2'),null);
});

test('blank edit and Escape-like unchanged text never erase an existing record', () => {
  const f = setupWidget(1);
  const before = f.records.get('id-0');
  named(f.render(), 'Entry hover editing').props.onClick({ offsetX: 35, offsetY: 10 });
  named(f.render(), 'Редактирование записи').props.onTextEditEnd({ characters: '    ' });
  assert.deepEqual(f.records.get('id-0'), before);
  named(f.render(), 'Entry hover editing').props.onClick({ offsetX: 35, offsetY: 10 });
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

test('Coreon DS help is only in header; no new-entry label or per-editor help', () => {
  const f = setupWidget(1);
  let t = f.render();
  const helps = findAll(t, n => n.props?.name === 'Coreon formatting help');
  assert.equal(helps.length, 1);
  assert.equal(helps[0].type, 'SVG');
  assert.ok(helps[0].props.tooltip.includes('**текст**'));
  assert.equal(helps[0].props.width, 20);
  assert.ok(helps[0].props.src.includes('viewBox="0 0 20 20"'));
  assert.equal(findAll(t, n => n.props?.name === 'Formatting tooltip').length, 0);
  assert.equal(findAll(t, n => n.type === 'Text' && n.children.includes('Новая запись')).length, 0);
  named(t, 'Entry hover editing').props.onClick({ offsetX: 30, offsetY: 8 });
  t = f.render();
  assert.ok(named(t, 'Редактирование записи'));
  assert.equal(findAll(t, n => n.props?.name === 'Coreon formatting help').length, 1);
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


test('empty AutoLayout spacers have explicit minimal height to avoid 100px Figma rows', () => {
  const code = fs.readFileSync(path.join(__dirname, '../widget-src/code.tsx'), 'utf8');
  assert.ok(!code.includes('<AutoLayout width="fill-parent" />'));
  assert.equal((code.match(/<AutoLayout width="fill-parent" height=\{1\} \/>/g)||[]).length, 1);
});


test('editing remains lightweight and preserves hyperlinks for rich entries', () => {
  const f = setupWidget(513);
  const tree = f.render();
  assert.equal(findAll(tree, n => n.props?.name === 'History entry').length, 5);
  assert.ok(findAll(tree,n => n.type==='Span' && n.props?.href === 'https://figma.com/file').length > 0);
  assert.ok(findAll(tree,n => n.props?.name === 'Pencil hover glyph').length > 0);
  assert.equal(f.records.size, 513);
});


test('permanent add Input has a neutral gray surface without a wrapping card', () => {
  const f=setupWidget(513);
  const tree=f.render();
  const input=named(tree,'Новая запись');
  assert.equal(input.props.inputFrameProps.fill,'#F4F5F7');
  assert.equal(input.props.inputFrameProps.cornerRadius,6);
  assert.equal(input.props.inputFrameProps.padding.horizontal,10);
  assert.equal(input.props.inputFrameProps.padding.vertical,8);
  assert.equal(findAll(tree,n=>n.props?.name==='Input background wrapper').length,0);
  assert.equal(findAll(tree,n=>n.props?.name==='Direct plain record input').length,0);
  assert.equal(findAll(tree,n=>n.props?.name==='Редактирование записи').length,0);
});

test('pencil activation highlights only selected edit Input; other entries stay rendered and clickable', () => {
  const f=setupWidget(2);
  const before=f.records.get('id-1');
  let tree=f.render();
  assert.equal(findAll(tree,n=>n.props?.name==='Entry hover editing').length,2);
  const area=findAll(tree,n=>n.props?.name==='Entry hover editing')[0];
  area.props.onClick({offsetX:35, offsetY:10});
  tree=f.render();
  const input=named(tree,'Редактирование записи');
  assert.equal(input.props.inputFrameProps.fill,'#F4F5F7');
  assert.equal(input.props.inputFrameProps.cornerRadius,6);
  assert.equal(findAll(tree,n=>n.props?.name==='Редактирование записи').length,1);
  assert.equal(findAll(tree,n=>n.props?.name==='History entry').length,2);
  assert.ok(findAll(tree,n=>n.type==='Span' && n.props?.href==='https://figma.com/file').length > 0);
  input.props.onTextEditEnd({characters:before.text});
  tree=f.render();
  assert.equal(findAll(tree,n=>n.props?.name==='Редактирование записи').length,0);
  assert.deepEqual(f.records.get('id-1'),before);
});


test('experimental import preserves source author/time, skips duplicates on retry and never rewrites legacy data', async () => {
  const f = setupWidget(2);
  const existing = f.records.get('id-0');
  const mkText = (name, characters, visible = true) => ({ type:'TEXT', name, characters, visible, parent:null });
  const mkRow = (id, author, date, content) => {
    const nodes = [mkText('Date', author), mkText('Created', date),
      mkText('EditableChange','Your update...', false), mkText('EditableChange', content)];
    const row = { type:'FRAME', id, name:'ChangeLogRow', visible:true, parent:null,
      findAll: (fn) => nodes.filter(fn) };
    nodes.forEach(node => node.parent = row);
    return row;
  };
  const rows = [mkRow('74:476','Original Author','11|15|26 @ 1:22 AM','Note one'),
    mkRow('74:499','Other Author','11|15|26 @ 1:19 AM','Note two')];
  const frame = { type:'FRAME', id:'74:437', name:'FigLog (Widget)', visible:true,
    findAll:(fn)=>rows.filter(fn) };
  rows.forEach(row => row.parent = frame);
  f.externalNodes.set(frame.id,frame);
  named(f.render(),'Open history').props.onClick();
  f.ui.onmessage({type:'FIGLOG_PREVIEW',frameId:'74:437'});
  await new Promise(resolve => setImmediate(resolve));
  const preview=f.activity.uiMessages.find(x=>x.type==='FIGLOG_PREVIEW_RESULT');
  assert.equal(preview.ready,2);
  f.ui.onmessage({type:'FIGLOG_IMPORT'});
  assert.equal(f.records.size,4);
  assert.deepEqual(f.records.get('id-0'),existing);
  const imported=[...f.records.values()].filter(r=>r.importedFrom);
  assert.equal(imported.length,2);
  assert.equal(imported[0].authorName,'Original Author');
  assert.equal(imported[0].createdAt,new Date(2026,10,15,1,22).getTime());
  assert.equal(imported[0].authorId,null);
  f.ui.onmessage({type:'FIGLOG_PREVIEW',frameId:'74:437'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.activity.uiMessages.filter(x=>x.type==='FIGLOG_PREVIEW_RESULT').at(-1).ready,0);
  f.ui.onmessage({type:'FIGLOG_IMPORT'});
  assert.equal(f.records.size,4);
  assert.equal(f.activity.uiMessages.filter(x=>x.type==='FIGLOG_IMPORTED').at(-1).added,0);
});


test('experimental importer refuses large 51-record write without mutating synced data', async () => {
  const f=setupWidget(1);
  const mkRow=(i) => {
    const children=[
      {type:'TEXT', name:'Date', characters:'Designer', visible:true, parent:null},
      {type:'TEXT', name:'Created', characters:'11|15|26 @ 10:05 AM', visible:true, parent:null},
      {type:'TEXT', name:'EditableChange', characters:'Note '+i, visible:true, parent:null}
    ];
    const row={type:'FRAME',id:'80:'+(i+100),name:'ChangeLogRow',visible:true,parent:null,findAll:(fn)=>children.filter(fn)};
    children.forEach(node=>node.parent=row);
    return row;
  };
  const rows=Array.from({length:51},(_,i)=>mkRow(i));
  const source={type:'FRAME',id:'80:1',name:'FigLog',visible:true,findAll:(fn)=>rows.filter(fn)};
  rows.forEach(row=>row.parent=source);
  f.externalNodes.set('80:1',source);
  named(f.render(),'Open history').props.onClick();
  f.ui.onmessage({type:'FIGLOG_PREVIEW',frameId:'80:1'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.activity.uiMessages.filter(m=>m.type==='FIGLOG_PREVIEW_RESULT').at(-1).ready,51);
  f.ui.onmessage({type:'FIGLOG_IMPORT'});
  assert.equal(f.records.size,1);
  assert.equal(f.activity.uiMessages.at(-1).type,'FIGLOG_ERROR');
  assert.match(f.activity.uiMessages.at(-1).message,/50/);
});
