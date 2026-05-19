#!/usr/bin/env node
// Replace inline GA4 + Clarity in public HTML with cookie-consent.js load
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP = new Set(['admin.html','404.html','article.html']);

function isPublicHtml(f){
  if (!f.endsWith('.html')) return false;
  if (SKIP.has(f)) return false;
  return true;
}

const files = fs.readdirSync(ROOT).filter(isPublicHtml);
let modified = 0;

for (const f of files){
  let content = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const original = content;

  // Pattern 1: Remove inline gtag bootstrap (multiple variations)
  content = content.replace(
    /<script[^>]*async[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-[^"]*"[^>]*><\/script>\s*/g,
    ''
  );
  content = content.replace(
    /<script>window\.dataLayer=window\.dataLayer\|\|\[\];function gtag\(\)\{dataLayer\.push\(arguments\);\}gtag\('js',new Date\(\)\);gtag\('config','G-[^']*'\);<\/script>\s*/g,
    ''
  );

  // Pattern 2: Remove inline Clarity (rqjsubgaek)
  content = content.replace(
    /<script[^>]*>\s*\(function\(c,l,a,r,i,t,y\)\{[^<]*clarity\.ms[^<]*\}\)\([^)]*\);?\s*<\/script>\s*/g,
    ''
  );

  // Add cookie-consent.js before </body> if not already present
  if (!content.includes('cookie-consent.js')){
    content = content.replace(
      /<\/body>/,
      '  <script src="/cookie-consent.js" defer></script>\n</body>'
    );
  }

  if (content !== original){
    fs.writeFileSync(path.join(ROOT, f), content);
    modified++;
    console.log(`✓ ${f}`);
  }
}

console.log(`\n✅ ${modified} files updated`);
