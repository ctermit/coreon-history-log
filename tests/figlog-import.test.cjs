const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const model = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../widget-src/model.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2019}}).outputText;
const importer = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../widget-src/figlog-import.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2019}}).outputText;
const { extractFiglogFrame, parseFiglogTimestamp } = vm.runInNewContext(model+'\n'+importer+'\n({extractFiglogFrame,parseFiglogTimestamp})');

function node(name,text,visible=true){return {type:'TEXT',name,characters:text,visible,parent:null};}
function row(id, author, date, body, extras=[]) {
 const texts=[node('Date',author),node('Created',date),node('EditableChange','Your update...',false),node('EditableChange',body),...extras];
 const item={type:'FRAME',id,name:'ChangeLogRow',visible:true,parent:null,findAll(fn){return texts.filter(fn);}};
 texts.forEach(n=>n.parent=item);
 return item;
}
function frame(rows) {
 const item={type:'FRAME',id:'74:437',name:'FigLog (Widget)',visible:true,findAll(fn){return rows.filter(fn);}};
 rows.forEach(r=>r.parent=item);
 return item;
}
test('read-only FigLog extraction matches the real small sample: four records and one empty draft', () => {
 const rows=[
 row('74:453','Sergey','11|16|26 @ 12:08 AM','Your update...'),
 row('74:476','Sergey','11|15|26 @ 1:22 AM','Same\n\n- list'),
 row('74:499','Sergey','11|15|26 @ 1:19 AM','Same\n\n- list',[node('Edited','EDITED 11|15|26 @ 1:22 AM')]),
 row('74:523','Sergey','11|15|26 @ 1:19 AM','Short'),
 row('74:546','Anastasia','10|22|26 @ 11:40 AM','Another',[node('Edited','EDITED 11|15|26 @ 1:19 AM')])
 ];
 const result=extractFiglogFrame(frame(rows));
 assert.equal(result.rowCount,5);
 assert.equal(result.entries.length,4);
 assert.equal(result.skipped.length,1);
 assert.equal(result.entries[0].text,'Same\n\n- list');
 assert.equal(result.entries[1].text,'Same\n\n- list');
 assert.notEqual(result.entries[0].id,result.entries[1].id);
 assert.equal(result.entries[1].updatedAt,new Date(2026,10,15,1,22).getTime());
 assert.equal(result.entries[3].authorName,'Anastasia');
 assert.equal(result.entries[0].importedFrom.rowId,'74:476');
});
test('unknown types and non-exportable links are skipped, not silently downgraded', () => {
 const badType=row('74:999','A','11|15|26 @ 9:00 PM','Text',[node('Type','Breaking')]);
 const linkRow=row('74:998','B','11|15|26 @ 9:01 PM','Text');
 linkRow.findAll = (fn)=>[...Object.values({
   texts: [node('Date','B'),node('Created','11|15|26 @ 9:01 PM'),node('EditableChange','Text')],
   links:[{type:'FRAME',name:'Links',visible:true,id:'link-list'}]
 }).flat()].filter(fn);
 const results=extractFiglogFrame(frame([badType,linkRow]));
 assert.equal(results.entries.length,0);
 assert.equal(results.skipped.length,2);
 assert.match(results.skipped[0].reason,/тип/);
 assert.match(results.skipped[1].reason,/ссылк/);
});
test('correctly parses midnight, noon, seconds and rejects impossible timestamps',()=>{
 assert.equal(parseFiglogTimestamp('11|15|26 @ 12:00 AM'),new Date(2026,10,15,0,0).getTime());
 assert.equal(parseFiglogTimestamp('11/15/2026 @ 12:00:00 PM'),new Date(2026,10,15,12,0).getTime());
 assert.equal(parseFiglogTimestamp('02|30|26 @ 5:00 PM'),null);
 assert.equal(parseFiglogTimestamp('garbage'),null);
});
test('large source extraction does not cap history to recent canvas entries',()=>{
 const rows=Array.from({length:530},(_,i)=>row('74:'+(1000+i),'Designer','11|15|26 @ 9:00 PM','Note '+i));
 assert.equal(extractFiglogFrame(frame(rows)).entries.length,530);
});
