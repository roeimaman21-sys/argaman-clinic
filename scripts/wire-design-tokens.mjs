#!/usr/bin/env node
// Wire design-tokens.css into all HTML files (public + admin)
// Inserts <link rel="stylesheet" href="design-tokens.css"> BEFORE style.css / admin.css
// Idempotent: skips files that already include design-tokens.css
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function isHtml(f){
  if (!f.endsWith('.html')) return false;
  return true;
}

const files = fs.readdirSync(ROOT).filter(isHtml);
let modified = 0;
let skipped = 0;

for (const f of files){
  const full = path.join(ROOT, f);
  let content = fs.readFileSync(full, 'utf8');
  const original = content;

  // Skip if already wired
  if (content.includes('design-tokens.css')){
    skipped++;
    continue;
  }

  // Insert BEFORE the first matching stylesheet link
  const stylePattern = /(\s*)<link rel="stylesheet" href="(style|admin)\.css">/;
  const m = content.match(stylePattern);
  if (m){
    const indent = m[1].includes('\n') ? m[1] : '\n  ';
    content = content.replace(
      stylePattern,
      `${indent}<link rel="stylesheet" href="design-tokens.css">${m[0]}`
    );
  } else {
    // Fallback: insert before </head>
    content = content.replace(
      /<\/head>/,
      '  <link rel="stylesheet" href="design-tokens.css">\n</head>'
    );
  }

  if (content !== original){
    fs.writeFileSync(full, content);
    modified++;
    if (modified <= 5 || modified % 50 === 0) console.log(`✓ ${f}`);
  }
}

console.log(`\n✅ ${modified} files updated, ${skipped} already wired`);
