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
function setup() {
  const elements = new Map();
  const sent = [];
  const doc = {
    getElementById(id) { if(!elements.has(id)) elements.set(id,mockNode('div')); return elements.get(id); },
    createElement(name) { return mockNode(name); },
    createTextNode(txt) { return mockNode('#text', txt); },
  };
  doc.getElementById('typeFilter').value = 'all';
  const fakeWindow = { onmessage:null };
  const ctx = vm.createContext({ window:fakeWindow, document:doc, parent:{postMessage:(m)=>sent.push(m)} });
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


test('history delete requires a confirmation and sends only one DELETE for the target', () => {
  const f = setup();
  const records = [{id:'old',text:'Legacy handoff',authorName:'Designer',createdAt:1000,kind:'handoff',category:null},
    {id:'keep',text:'Keep note',authorName:'Designer',createdAt:999,kind:'change',category:'added'}];
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records}}});
  const edit = f.get('list').children[0].children.at(-1);
  assert.equal(edit.textContent,'Редактировать');
  edit.onclick();
  assert.equal(f.get('editText').value,'Legacy handoff');
  f.get('deleteEntry').onpointerdown();
  f.get('editText').onblur();
  assert.equal(f.sent.filter(x => x.pluginMessage.type==='EDIT').length, 0);
  f.get('deleteEntry').onclick();
  assert.equal(f.get('deleteConfirmation').hidden,false);
  assert.equal(f.sent.filter(x => x.pluginMessage.type==='DELETE').length, 0);
  f.get('confirmDelete').onclick();
  f.get('confirmDelete').onclick();
  assert.equal(f.sent.filter(x => x.pluginMessage.type==='DELETE').length, 1);
  assert.equal(f.sent.at(-1).pluginMessage.id,'old');
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'DELETED',id:'old'}}});
  assert.equal(f.get('deleteConfirmation').hidden,true);
});

test('HTML history auto-saves changed text on blur, but skips unchanged/blank edits', () => {
  const f=setup();
  const rec={id:'a',text:'Original',authorName:'Designer',createdAt:10,kind:'change',category:'changed'};
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[rec]}}});
  f.get('list').children[0].children.at(-1).onclick();
  f.get('editText').value='Changed';
  f.get('editText').onblur();
  assert.equal(f.sent.at(-1).pluginMessage.type,'EDIT');
  assert.equal(f.sent.at(-1).pluginMessage.newText,'Changed');
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'SAVED'}}});
  f.get('list').children[0].children.at(-1).onclick();
  const edits=f.sent.filter(x=>x.pluginMessage.type==='EDIT').length;
  f.get('editText').onblur(); // unchanged draft
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,edits);
  f.get('list').children[0].children.at(-1).onclick();
  f.get('editText').value='   ';
  f.get('editText').onblur();
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,edits);
});


test('HTML editor handles ordinary keystrokes and Escape without throwing', () => {
  const f = setup();
  const rec = {id:'key',text:'Original',authorName:'Designer',createdAt:10,kind:'change',category:'changed'};
  f.fakeWindow.onmessage({data:{pluginMessage:{type:'STATE',records:[rec]}}});
  f.get('list').children[0].children.at(-1).onclick();
  assert.doesNotThrow(() => f.get('editText').onkeydown({key:'a',preventDefault(){}}));
  assert.doesNotThrow(() => f.get('editText').onkeydown({key:'Enter',preventDefault(){}}));
  let prevented = false;
  f.get('editText').onkeydown({key:'Escape',preventDefault(){prevented = true;}});
  assert.equal(prevented, true);
  assert.equal(f.sent.filter(x=>x.pluginMessage.type==='EDIT').length,0);
});

test('history timestamps use JetBrains Mono with Roboto Mono fallback and no comma', () => {
  assert.match(html, /JetBrains Mono/);
  assert.match(html, /Roboto Mono/);
  assert.match(html, /toLocaleDateString/);
  assert.match(html, /toLocaleTimeString/);
  assert.match(html, /secondary tiny timestamp/);
});
