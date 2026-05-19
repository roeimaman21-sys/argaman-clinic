#!/usr/bin/env node
/**
 * namespace-audit.mjs — Counts window.X assignments across JS files.
 * Useful to track migration to CRM.register namespace.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', '_unused', '_build', '.git', 'frontend']);

function* walk(dir){
  for (const e of fs.readdirSync(dir, { withFileTypes: true })){
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && /\.(js|html)$/.test(e.name)) yield p;
  }
}

const byFile = {};
const byName = {};
let total = 0;

for (const file of walk(ROOT)){
  const content = fs.readFileSync(file, 'utf8');
  // Match `window.NAME = ` (excluding comparisons like `window.X ===` and method calls)
  const re = /window\.([A-Z][a-zA-Z0-9_]+)\s*=\s*(?!=)/g;
  let m;
  const inThisFile = new Set();
  while ((m = re.exec(content))){
    const name = m[1];
    inThisFile.add(name);
    byName[name] = (byName[name] || 0) + 1;
    total++;
  }
  if (inThisFile.size > 0){
    const rel = path.relative(ROOT, file);
    byFile[rel] = [...inThisFile];
  }
}

console.log(`# Namespace Audit Report — window.* Assignments\n`);
console.log(`Total: **${total}** assignments across **${Object.keys(byFile).length}** files\n`);

console.log(`\n## Top 20 globals by frequency\n`);
const sortedNames = Object.entries(byName).sort((a,b)=>b[1]-a[1]).slice(0, 20);
console.log('| Name | Count |');
console.log('|---|---|');
sortedNames.forEach(([n,c]) => console.log(`| \`window.${n}\` | ${c} |`));

console.log(`\n## Files by global count\n`);
console.log('| File | Globals |');
console.log('|---|---|');
const sortedFiles = Object.entries(byFile).sort((a,b)=>b[1].length-a[1].length).slice(0, 30);
sortedFiles.forEach(([f, names]) => {
  console.log(`| \`${f}\` | ${names.length} (${names.slice(0,5).join(', ')}${names.length>5?'...':''}) |`);
});

console.log(`\n## Migration Recommendation\n`);
console.log('Each \`window.X = ...\` could be replaced with \`CRM.register("X", ...)\` for cleaner namespacing.');
console.log('Keep \`window.X\` as alias in transition period for backwards compat.');

fs.writeFileSync('namespace-audit-report.md', `# Namespace Audit\n\nTotal: ${total} assignments\nFiles: ${Object.keys(byFile).length}\n\nTop names:\n${sortedNames.map(([n,c])=>`- \`window.${n}\`: ${c}`).join('\n')}\n\nFull data:\n${JSON.stringify(byFile, null, 2)}\n`);
console.log(`\n✅ Report: namespace-audit-report.md`);
