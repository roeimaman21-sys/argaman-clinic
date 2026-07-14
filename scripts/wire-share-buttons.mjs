#!/usr/bin/env node
// Insert share buttons after the author-box on article pages that have one.
// Also wires share-buttons.js site-wide (harmless no-op on pages without
// any [data-share-*] elements).
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXCLUDE = new Set(['admin.html', 'article.html', 'guide-source.html', 'og-source.html']);

const SHARE_HTML = `
<div class="share-buttons">
  <span class="share-buttons-label">שתפו:</span>
  <button class="share-btn" data-share-native aria-label="שתפו" title="שתפו"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
  <a class="share-btn share-wa" href="https://wa.me/?text=%SHARE_URL%" target="_blank" rel="noopener noreferrer" aria-label="שתפו בוואטסאפ" title="וואטסאפ"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg></a>
  <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=%SHARE_URL%" target="_blank" rel="noopener noreferrer" aria-label="שתפו בפייסבוק" title="פייסבוק"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
  <button class="share-btn" data-share-copy aria-label="העתיקו קישור" title="העתיקו קישור"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
</div>
`.trim();

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));
let shareInserted = 0;
let jsWired = 0;

for (const f of files) {
  const full = path.join(ROOT, f);
  let c = fs.readFileSync(full, 'utf8');
  const before = c;

  // Insert share buttons after author-box (only on pages with that exact pattern)
  if (!c.includes('class="share-buttons"')) {
    const re = /(<a href="about\.html"[^>]*>קראו עוד על גל ←<\/a>\s*<\/div>\s*<\/div>)/;
    if (re.test(c)) {
      const canonicalMatch = c.match(/<link rel="canonical" href="([^"]+)">/);
      const url = canonicalMatch ? canonicalMatch[1] : '';
      const shareHtml = SHARE_HTML.replace(/%SHARE_URL%/g, encodeURIComponent(url));
      c = c.replace(re, `$1\n${shareHtml}`);
      if (c !== before) shareInserted++;
    }
  }

  // Wire share-buttons.js (harmless everywhere; only activates on pages with the markup above)
  if (!c.includes('share-buttons.js')) {
    const beforeJs = c;
    c = c.replace(/<script src="motion\.js" defer><\/script>/, `<script src="motion.js" defer></script>\n  <script src="share-buttons.js" defer></script>`);
    if (c !== beforeJs) jsWired++;
  }

  if (c !== before) fs.writeFileSync(full, c);
}

console.log(`✅ Share buttons inserted on ${shareInserted} article pages`);
console.log(`✅ share-buttons.js wired on ${jsWired} pages`);
