#!/usr/bin/env node
// Upgrade <img src="X.webp" onerror="...X.jpg"> to a proper <picture> element
// with AVIF + WebP + JPG sources, using native browser format negotiation
// instead of a JS onerror fallback chain.
//
// Preserves every other attribute on the original <img> tag verbatim
// (class, width, height, loading, decoding, fetchpriority, alt, style...).
//
// Scope: only images that already have a generated .avif + .webp pair.
// Excludes template/generator files that are never browsed directly.

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXCLUDE = new Set([
  'admin.html',
  'article.html',       // noindex template, zero inbound links, never browsed
  'guide-source.html',  // Puppeteer PDF-render template
  'og-source.html',     // Puppeteer OG-image-render template
]);

// Image stems that have a verified .avif + .webp + .jpg trio on disk
const STEMS = ['gal', 'logo'];

function migrateFile(content) {
  let changed = false;

  for (const stem of STEMS) {
    const re = new RegExp(
      `<img\\b((?:(?!>)[\\s\\S])*?)\\bsrc="${stem}\\.webp"((?:(?!>)[\\s\\S])*?)\\bonerror="this\\.onerror=null;this\\.src='${stem}\\.jpg'"((?:(?!>)[\\s\\S])*?)>`,
      'g'
    );

    content = content.replace(re, (full, before, between, after) => {
      changed = true;
      // Reassemble the img's attributes minus src/onerror, keep everything else
      const restAttrs = (before + between + after).replace(/\s+/g, ' ').trim();
      const imgTag = `<img src="${stem}.jpg"${restAttrs ? ' ' + restAttrs : ''}>`;
      return (
        `<picture>` +
          `<source srcset="${stem}.avif" type="image/avif">` +
          `<source srcset="${stem}.webp" type="image/webp">` +
          imgTag +
        `</picture>`
      );
    });
  }

  return { content, changed };
}

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));
let filesChanged = 0;
let totalTagsTouched = 0;

for (const f of files) {
  const full = path.join(ROOT, f);
  const original = fs.readFileSync(full, 'utf8');
  const beforeCount = STEMS.reduce((sum, s) => sum + (original.match(new RegExp(`src="${s}\\.webp"`, 'g')) || []).length, 0);

  const { content, changed } = migrateFile(original);

  if (changed) {
    fs.writeFileSync(full, content);
    filesChanged++;
    totalTagsTouched += beforeCount;
  }
}

console.log(`✅ Migrated ${filesChanged} files, ${totalTagsTouched} <img> tags upgraded to <picture>`);
console.log(`⏭  Skipped (excluded): ${[...EXCLUDE].join(', ')}`);
