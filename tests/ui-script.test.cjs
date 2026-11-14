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
