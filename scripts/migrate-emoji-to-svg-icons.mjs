#!/usr/bin/env node
// Replace structural emoji (used as button/nav icons) with proper SVG icons.
// Content/decorative emoji in prose text are left untouched by design.
//
// Distinguishing rule: only replace an emoji that appears IMMEDIATELY after
// a tag's closing ">" (i.e. it's the first rendered content of that element,
// the classic "icon prefix" button pattern: `<a ...>📱 Text</a>`).
// An emoji appearing mid-sentence in prose (preceded by other text, not a
// tag boundary) is left alone — e.g. "...או 📱 <a href=...>" stays as-is.
//
// Icons are generic Lucide-style geometric glyphs (2px stroke, round caps),
// NOT brand logos — avoids any trademark-reproduction risk (e.g. we do not
// attempt to recreate the official WhatsApp glyph; a generic message-bubble
// icon is used instead, matching the existing .whatsapp-fab SVG already
// used elsewhere on the site).

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXCLUDE = new Set(['admin.html', 'article.html', 'guide-source.html', 'og-source.html']);

const ICONS = {
  '📱': '<svg class="icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>',
  '✕':  '<svg class="icon-inline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
};

function migrateFile(content) {
  let changed = false;
  for (const [emoji, svg] of Object.entries(ICONS)) {
    // Only match emoji immediately after a tag-close ">" (structural icon-prefix position)
    const re = new RegExp(`(>)${emoji}( ?)`, 'gu');
    const before = content;
    content = content.replace(re, (full, gt, space) => {
      changed = true;
      return gt + svg + space;
    });
  }
  return { content, changed };
}

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));
let filesChanged = 0;
let totalReplacements = 0;

for (const f of files) {
  const full = path.join(ROOT, f);
  const original = fs.readFileSync(full, 'utf8');
  const beforeCount = Object.keys(ICONS).reduce((sum, e) =>
    sum + (original.match(new RegExp(`>${e}`, 'gu')) || []).length, 0);

  const { content, changed } = migrateFile(original);

  if (changed) {
    fs.writeFileSync(full, content);
    filesChanged++;
    totalReplacements += beforeCount;
  }
}

console.log(`✅ Migrated ${filesChanged} files, ${totalReplacements} structural emoji replaced with SVG icons`);
console.log(`⏭  Skipped (excluded): ${[...EXCLUDE].join(', ')}`);
