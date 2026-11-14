import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(import.meta.dirname, '..');
const result = ['widget-src/model.ts', 'widget-src/code.tsx'].map((name) => {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.None,
      jsx: ts.JsxEmit.React,
      jsxFactory: 'figma.widget.h',
      jsxFragmentFactory: 'figma.widget.Fragment',
    },
    reportDiagnostics: true,
    fileName: name,
  });
  const errors = (output.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    for (const d of errors) process.stderr.write(ts.flattenDiagnosticMessageText(d.messageText, '\n') + '\n');
    process.exitCode = 1;
  }
  return output.outputText;
});
if (process.exitCode) process.exit(process.exitCode);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/code.js'), `/* Generated: do not edit manually */\n${result.join('\n')}`, 'utf8');
console.log('Built dist/code.js');
