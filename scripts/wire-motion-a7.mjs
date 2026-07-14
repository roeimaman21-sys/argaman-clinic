#!/usr/bin/env node
// A7 wiring: motion.css + motion.js
import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const SKIP = new Set(['admin.html', '404.html']);
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP.has(f));
let mods = 0, skips = 0;

for (const f of files){
  let c = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const before = c;
  if (!c.includes('motion.css')){
    c = c.replace(
      /<link rel="stylesheet" href="trust-bar\.css">/,
      `<link rel="stylesheet" href="trust-bar.css">\n  <link rel="stylesheet" href="motion.css">`
    );
  }
  if (!c.includes('motion.js')){
    c = c.replace(
      /<script src="trust-bar\.js" defer><\/script>/,
      `<script src="trust-bar.js" defer></script>\n  <script src="motion.js" defer></script>`
    );
  }
  if (c !== before) { fs.writeFileSync(path.join(ROOT, f), c); mods++; }
  else skips++;
}
console.log(`✅ ${mods} files wired with motion, ${skips} skipped`);
