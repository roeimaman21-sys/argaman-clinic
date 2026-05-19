#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP = new Set(['admin.html', '404.html']);

const REPLACEMENTS = [
  {
    needle: '<script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>',
    replacement: '<script src="https://unpkg.com/aos@2.3.1/dist/aos.js" integrity="sha384-wziAfh6b/qT+3LrqebF9WeK4+J5sehS6FA10J1t3a866kJ/fvU5UwofWnQyzLtwu" crossorigin="anonymous"></script>'
  },
  {
    needle: '<link rel="preload" href="https://unpkg.com/aos@2.3.1/dist/aos.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">',
    replacement: '<link rel="preload" href="https://unpkg.com/aos@2.3.1/dist/aos.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'" integrity="sha384-/rJKQnzOkEo+daG0jMjU1IwwY9unxt1NBw3Ef2fmOJ3PW/TfAg2KXVoWwMZQZtw9" crossorigin="anonymous">'
  }
];

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !SKIP.has(f));
let updated = 0;
for (const f of files){
  let content = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const original = content;
  for (const { needle, replacement } of REPLACEMENTS){
    if (content.includes(needle)){
      content = content.split(needle).join(replacement);
    }
  }
  if (content !== original){
    fs.writeFileSync(path.join(ROOT, f), content);
    updated++;
  }
}
console.log(`✅ ${updated} files updated`);
