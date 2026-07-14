#!/usr/bin/env node
// Wire sw-register.js into all public pages (registers the service worker
// that has existed in sw.js but was never actually activated anywhere).
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXCLUDE = new Set(['admin.html', 'guide-source.html', 'og-source.html']);

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));
let mods = 0;

for (const f of files) {
  const full = path.join(ROOT, f);
  let c = fs.readFileSync(full, 'utf8');
  if (c.includes('sw-register.js')) continue;
  const before = c;
  c = c.replace(/<\/body>/, '  <script src="sw-register.js" defer></script>\n</body>');
  if (c !== before) {
    fs.writeFileSync(full, c);
    mods++;
  }
}

console.log(`✅ ${mods} files wired with sw-register.js`);
console.log(`⏭  Skipped (excluded): ${[...EXCLUDE].join(', ')}`);
