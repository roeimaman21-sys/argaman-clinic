#!/usr/bin/env node
// Fix broken skip-link: standardize <main id="main"> to <main id="main-content">
// so it matches the skip-link's href="#main-content" (used on 73 pages already).
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'admin.html');

let fixed = 0;

for (const f of files) {
  const full = path.join(ROOT, f);
  let c = fs.readFileSync(full, 'utf8');
  const before = c;

  // Only rename the exact <main id="main"> pattern (not main-content, not other ids)
  c = c.replace(/<main id="main">/g, '<main id="main-content">');

  if (c !== before) {
    fs.writeFileSync(full, c);
    fixed++;
  }
}

console.log(`✅ Fixed ${fixed} pages (id="main" → id="main-content")`);
