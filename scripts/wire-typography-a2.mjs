#!/usr/bin/env node
// A2 wiring:
//   1. Insert <link rel="stylesheet" href="typography.css"> after design-tokens.css
//   2. Replace static Heebo font load with variable Heebo (single woff2 family)
// Idempotent: skips files already migrated.
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

// Static Heebo URL patterns we want to replace
const STATIC_PATTERNS = [
  /family=Heebo:wght@400;600;700;800/g,
  /family=Heebo:wght@300;400;500;600;700;800;900/g,
];
const VARIABLE_URL_PART = 'family=Heebo:wght@100..900';

let modCount = 0, fontFixCount = 0, skipCount = 0;

for (const f of files){
  const full = path.join(ROOT, f);
  let content = fs.readFileSync(full, 'utf8');
  const before = content;

  // 1. Add typography.css after design-tokens.css if not already present
  if (!content.includes('typography.css')){
    content = content.replace(
      /<link rel="stylesheet" href="design-tokens\.css">/,
      `<link rel="stylesheet" href="design-tokens.css">\n  <link rel="stylesheet" href="typography.css">`
    );
  }

  // 2. Migrate to variable Heebo
  for (const pattern of STATIC_PATTERNS){
    if (pattern.test(content)){
      content = content.replace(pattern, VARIABLE_URL_PART);
      fontFixCount++;
    }
  }

  if (content !== before){
    fs.writeFileSync(full, content);
    modCount++;
  } else {
    skipCount++;
  }
}

console.log(`✅ ${modCount} files updated, ${fontFixCount} font URLs migrated to variable, ${skipCount} already migrated`);
