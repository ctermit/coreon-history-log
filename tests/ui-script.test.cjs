const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../ui.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

function mockNode(name, text = '') {
  const node = {tagName:name.toUpperCase(), textContent:text, children:[], value:'', className:'',
    classList:{toggle(){}}, append(...c){this.children.push(...c)}, replaceChildren(...c){this.children=c},
    focus(){}, setAttribute(){}};
  return node;
}
function setup(dateClass = null) {
  const elements = new Map();
  const sent = [];
  const doc = {
    getElementById(id) { if(!elements.has(id)) elements.set(id,mockNode('div')); return elements.get(id); },
    createElement(name) { return mockNode(name); },
    createTextNode(txt) { return mockNode('#text', txt); },
  };
  doc.getElementById('typeFilter').value = 'all';
  const fakeWindow = { onmessage:null };
  const ctx = vm.createContext({ window:fakeWindow, document:doc, parent:{postMessage:(m)=>sent.push(m)}, ...(dateClass ? {Date:dateClass} : {}) });
  vm.runInContext(script, ctx);
  return { doc, elements, sent, fakeWindow, get:id=>doc.getElementById(id) };
}

test('HTML history requests unified snapshot on initialization',()=>{
  const fake=setup(); assert.equal(fake.sent[0].pluginMessage.type, 'REQUEST_STATE');
});

test('HTML renders 40 records per page and preserves title and metadata',()=>{
  const fake=setup(); const records=Array.from({length:55},(_,i)=>({id:String(i),text:'**Bold** and [Figma](https://figma.com)\n- test',authorName:'Designer',createdAt:1763180000000+i,kind:'change',category:i%2?'added':null}));
  fake.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records}}});
  assert.equal(fake.get('list').children.length,40);
  assert.equal(fake.get('total').textContent,'55 записей');
  // Within first entry: meta + markdown + edit action; markdown has strong/anchor/list DOM nodes
  const first=fake.get('list').children[0];
  const md=first.children[1];
  const bold=md.children[0].children.find(x=>x.tagName==='STRONG');
  const link=md.children[0].children.find(x=>x.tagName==='A');
  assert.equal(bold.textContent,'Bold');
  assert.equal(link.href,'https://figma.com');
  assert.equal(link.rel,'noopener noreferrer');
  assert.equal(md.children[1].tagName,'UL');
});

test('HTML renders unsupported dangerous link syntax as inert text',()=>{
  const fake=setup(); fake.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[{id:'x',text:'<img onerror=alert(1)> [x](javascript:evil())',authorName:'D',createdAt:1,kind:'change',category:null}]}}});
  const md=fake.get('list').children[0].children[1];
  assert.equal(md.children[0].children.filter(x=>x.tagName==='A').length,0);
});


test('list deletion is confirmed once by ID; cancel leaves records intact', () => {
  const f = setup();
  const records = [{id:'old',text:'Legacy handoff',authorName:'Designer',createdAt:1000,kind:'handoff',category:null},
    {id:'keep',text:'Keep note',authorName:'Designer',createdAt:999,kind:'change',category:'added'}];
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records}}});
  const actions = f.get('list').children[0].children.at(-1);
  assert.equal(actions.children[0].textContent, 'Редактировать');
  assert.equal(actions.children[1].textContent, 'Удалить');
  actions.children[1].onclick();
  let confirmRow = f.get('list').children[0].children.at(-1);
  assert.equal(confirmRow.className, 'delete-confirmation');
  assert.equal(confirmRow.children[0].textContent,'Удалить запись?');
  assert.equal(confirmRow.children.length,2);
  assert.equal(confirmRow.children[1].children[0].textContent,'Удалить');
  assert.equal(confirmRow.children[1].children[1].textContent,'Отмена');
  confirmRow.children[1].children[1].onclick();
  assert.equal(f.get('list').children[0].children.at(-1).className,'entry-actions');
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='DELETE').length,0);
  f.get('list').children[0].children.at(-1).children[1].onclick();
  confirmRow = f.get('list').children[0].children.at(-1);
  const confirm = confirmRow.children[1].children[0];
  confirm.onclick();
  confirm.onclick();
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='DELETE').length,1);
  assert.equal(f.sent.at(-1).pluginMessage.id,'old');
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,0);
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'DELETED',id:'old'}}});
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[records[1]]}}});
  assert.equal(f.get('total').textContent,'1 записей');
});

test('oldest record remains deletable on the last page of 530 entries', () => {
  const f = setup();
  const records = Array.from({length:530},(_,i)=>({
    id:'id-'+i,text:'Note '+i,authorName:'Designer',createdAt:530-i,kind:'change',category:'changed'
  }));
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records}}});
  for (let i=0;i<13;i++) {
    const next=f.get('pageFooter').children.at(-1);
    assert.equal(next.textContent,'Дальше');
    next.onclick();
  }
  assert.equal(f.get('list').children.length,10);
  const oldest=f.get('list').children.at(-1);
  assert.equal(oldest.children[1].children[0].children[0].textContent,'Note 529');
  oldest.children.at(-1).children[1].onclick();
  const confirmation=f.get('list').children.at(-1).children.at(-1);
  confirmation.children[1].children[0].onclick();
  assert.equal(f.sent.at(-1).pluginMessage.id,'id-529');
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='DELETE').length,1);
});

test('search can find and cancel deletion of an old record', () => {
  const f=setup();
  const records=Array.from({length:110},(_,i)=>({
    id:'id-'+i,text:i===109?'Unique oldest note':'Other note '+i,
    authorName:'Designer',createdAt:110-i,kind:'change',category:'changed'
  }));
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records}}});
  f.get('search').value='Unique oldest note';
  f.get('search').oninput();
  assert.equal(f.get('list').children.length,1);
  f.get('list').children[0].children.at(-1).children[1].onclick();
  f.get('list').children[0].children.at(-1).children[1].children[1].onclick();
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='DELETE').length,0);
});

test('HTML history auto-saves changed text on blur, but skips unchanged/blank edits', () => {
  const f=setup();
  const rec={id:'a',text:'Original',authorName:'Designer',createdAt:10,kind:'change',category:'changed'};
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[rec]}}});
  f.get('list').children[0].children.at(-1).children[0].onclick();
  f.get('editText').value='Changed';
  f.get('editText').onblur();
  assert.equal(f.sent.at(-1).pluginMessage.type,'EDIT');
  assert.equal(f.sent.at(-1).pluginMessage.newText,'Changed');
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'SAVED'}}});
  f.get('list').children[0].children.at(-1).children[0].onclick();
  const edits=f.sent.filter(x=>x.pluginMessage.type==='EDIT').length;
  f.get('editText').onblur(); // unchanged draft
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,edits);
  f.get('list').children[0].children.at(-1).children[0].onclick();
  f.get('editText').value='   ';
  f.get('editText').onblur();
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,edits);
});


test('HTML editor handles ordinary keystrokes and Escape without throwing', () => {
  const f = setup();
  const rec = {id:'key',text:'Original',authorName:'Designer',createdAt:10,kind:'change',category:'changed'};
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[rec]}}});
  f.get('list').children[0].children.at(-1).children[0].onclick();
  assert.doesNotThrow(() => f.get('editText').onkeydown({key:'a',preventDefault(){}}));
  assert.doesNotThrow(() => f.get('editText').onkeydown({key:'Enter',preventDefault(){}}));
  let prevented = false;
  f.get('editText').onkeydown({key:'Escape',preventDefault(){prevented = true;}});
  assert.equal(prevented, true);
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,0);
});

test('history timestamps match the canvas 24-hour format without Intl', () => {
  class BrokenLocaleDate extends Date {
    toLocaleTimeString() { return '9:05 PM'; }
    toLocaleDateString() { return '11/15/2026'; }
  }
  const f = setup(BrokenLocaleDate);
  const timestamp = new Date(2026, 10, 15, 21, 5).getTime();
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[{
    id:'date',text:'Note',authorName:'Designer',createdAt:timestamp,kind:'change',category:'changed'
  }]}}});
  const meta = f.get('list').children[0].children[0];
  assert.equal(meta.children[1].textContent,'15.11.2026 21:05');
  assert.match(html, /JetBrains Mono/);
  assert.match(html, /Roboto Mono/);
  assert.match(html, /secondary tiny timestamp/);
});

test('confirmation overlays the chosen entry without adding a block below it; close is native only', () => {
  assert.match(html, /\.delete-confirmation \{ position:absolute; inset:0;/);
  assert.match(html, /\.delete-confirmation::before/);
  assert.doesNotMatch(html, /id="close"/);
  assert.doesNotMatch(html, /\$\('close'\)\.onclick/);
  const f = setup();
  const records = [
    {id:'target',text:'Target',authorName:'A',createdAt:200,kind:'change',category:'changed'},
    {id:'other',text:'Other',authorName:'B',createdAt:100,kind:'change',category:'changed'}
  ];
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records}}});
  f.get('list').children[0].children.at(-1).children[1].onclick();
  const target = f.get('list').children[0];
  const other = f.get('list').children[1];
  assert.equal(target.children.at(-1).className,'delete-confirmation');
  assert.equal(other.children.at(-1).className,'entry-actions');
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='DELETE').length,0);
});


test('experimental FigLog UI requires preview before asking widget to import', () => {
  const f = setup();
  f.get('figlogImport').hidden = true; // HTML has the initial hidden attribute; mock DOM must reflect it.
  f.get('figlogOpen').onclick();
  assert.equal(f.get('figlogImport').hidden, false);
  f.get('figlogSource').value = 'https://www.figma.com/design/example/file?node-id=74-437';
  f.get('figlogInspect').onclick();
  assert.equal(f.sent.at(-1).pluginMessage.type, 'FIGLOG_PREVIEW');
  assert.equal(f.sent.at(-1).pluginMessage.frameId, '74:437');
  assert.equal(f.sent.filter(x => x.pluginMessage.type === 'FIGLOG_IMPORT').length, 0);
  f.fakeWindow.onmessage({ data: { pluginMessage: {
    type: 'FIGLOG_PREVIEW_RESULT', rowCount: 5, ready: 4, duplicates: 0, skipped: [],
    examples: [{ author: 'Designer', createdLabel: '11|15|26 @ 1:19 AM', text: 'Note' }]
  } } });
  assert.equal(f.get('figlogConfirm').hidden, false);
  f.get('figlogConfirm').onclick();
  f.get('figlogConfirm').onclick();
  assert.equal(f.sent.filter(x => x.pluginMessage.type === 'FIGLOG_IMPORT').length, 1);
  f.fakeWindow.onmessage({ data: { pluginMessage: { type: 'FIGLOG_IMPORTED', added: 4, duplicates: 0, skipped: 0 } } });
  assert.equal(f.get('figlogConfirm').hidden, true);
});
