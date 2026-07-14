#!/usr/bin/env node
// Wire hero-polish.css into all public pages (CSS only — no markup changes)
// Pages that opt into A3 hero choreography use data-animate-step attributes.
import fs from 'fs';
import path from 'path';
const ROOT = process.cwd();
const SKIP = new Set(['admin.html', '404.html']);
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP.has(f));
let mods = 0;
for (const f of files){
  let c = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (c.includes('hero-polish.css')) continue;
  const before = c;
  c = c.replace(
    /<link rel="stylesheet" href="motion\.css">/,
    `<link rel="stylesheet" href="motion.css">\n  <link rel="stylesheet" href="hero-polish.css">`
  );
  if (c !== before){ fs.writeFileSync(path.join(ROOT, f), c); mods++; }
}
console.log(`✅ hero-polish.css wired into ${mods} additional pages`);
