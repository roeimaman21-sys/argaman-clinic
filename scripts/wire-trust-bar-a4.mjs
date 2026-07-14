#!/usr/bin/env node
// A4.1 wiring:
//   1. Insert <link rel="stylesheet" href="trust-bar.css"> after typography.css
//   2. Insert <script src="trust-bar.js" defer></script> before </body>
// Skips admin.html (CRM uses its own status bar).
// Idempotent: skips files already wired.
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP = new Set(['admin.html', '404.html']);
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP.has(f));

let mods = 0, skips = 0;

for (const f of files){
  const full = path.join(ROOT, f);
  let c = fs.readFileSync(full, 'utf8');
  const before = c;

  // 1. Inject trust-bar.css after typography.css (idempotent)
  if (!c.includes('trust-bar.css')){
    c = c.replace(
      /<link rel="stylesheet" href="typography\.css">/,
      `<link rel="stylesheet" href="typography.css">\n  <link rel="stylesheet" href="trust-bar.css">`
    );
  }

  // 2. Inject trust-bar.js before </body> (idempotent)
  if (!c.includes('trust-bar.js')){
    c = c.replace(
      /<\/body>/,
      `  <script src="trust-bar.js" defer></script>\n</body>`
    );
  }

  if (c !== before){
    fs.writeFileSync(full, c);
    mods++;
  } else {
    skips++;
  }
}

console.log(`✅ ${mods} files wired, ${skips} already had trust-bar`);
