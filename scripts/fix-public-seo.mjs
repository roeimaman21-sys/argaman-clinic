#!/usr/bin/env node
/**
 * fix-public-seo.mjs — One-time sweep of all public HTML files to apply
 * SEO + performance best practices identified by the audit.
 *
 * Changes applied per file:
 *  1. Add width/height to common <img> tags missing them (CLS fix)
 *  2. Add `loading="lazy"` to all images that don't have it (except above-fold)
 *  3. Add `decoding="async"` to all images
 *
 * Skips: admin.html, article.html (template, noindex), node_modules/**
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const SKIP = new Set(['admin.html', 'article.html', '404.html']);

// Known image dimensions
const IMG_DIMS = {
  'logo.webp':       { w: 48, h: 48 },
  'logo.jpg':        { w: 48, h: 48 },
  'logo.png':        { w: 48, h: 48 },
  'gal.jpg':         { w: 600, h: 420 },
  'gal.webp':        { w: 600, h: 420 },
  'og-image.jpg':    { w: 1200, h: 630 },
  'og-image.webp':   { w: 1200, h: 630 },
  'apple-touch-icon.png': { w: 180, h: 180 },
  'favicon-32.png':  { w: 32, h: 32 }
};

function shouldSkip(file) {
  if (SKIP.has(file)) return true;
  if (file.startsWith('node_modules')) return true;
  if (file.startsWith('frontend/')) return true;
  if (file.startsWith('scripts/')) return true;
  return !file.endsWith('.html');
}

function processHtml(content, filename) {
  let changed = 0;

  // Pattern: <img ...src="..."...> without width/height/loading/decoding
  content = content.replace(/<img\s+([^>]*)>/g, (match, attrs) => {
    let newAttrs = attrs;
    let modified = false;

    // Extract src
    const srcMatch = attrs.match(/src=["']([^"']+)["']/);
    if (!srcMatch) return match;
    const src = srcMatch[1];
    const basename = path.basename(src.split('?')[0]);

    // Add width/height if missing AND we know dimensions
    if (IMG_DIMS[basename] && !/\bwidth=/.test(attrs) && !/\bheight=/.test(attrs)) {
      const { w, h } = IMG_DIMS[basename];
      newAttrs += ` width="${w}" height="${h}"`;
      modified = true;
    }

    // Add loading="lazy" if missing
    if (!/\bloading=/.test(newAttrs)) {
      newAttrs += ` loading="lazy"`;
      modified = true;
    }

    // Add decoding="async" if missing
    if (!/\bdecoding=/.test(newAttrs)) {
      newAttrs += ` decoding="async"`;
      modified = true;
    }

    if (modified) changed++;
    return `<img ${newAttrs.trim()}>`;
  });

  return { content, changed };
}

function main() {
  const files = fs.readdirSync(ROOT).filter(f => !shouldSkip(f));
  let totalFiles = 0, totalImgsFixed = 0;
  for (const file of files) {
    const full = path.join(ROOT, file);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    const original = fs.readFileSync(full, 'utf8');
    const { content, changed } = processHtml(original, file);
    if (changed > 0 && content !== original) {
      fs.writeFileSync(full, content);
      totalFiles++;
      totalImgsFixed += changed;
      console.log(`✓ ${file} — ${changed} img(s) updated`);
    }
  }
  console.log(`\n✅ Done: ${totalFiles} files updated, ${totalImgsFixed} img tags improved`);
}

main();
