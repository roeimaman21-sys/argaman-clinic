#!/usr/bin/env node
// Migrate AOS (Animate On Scroll library) to our own motion.css/.js system.
// Removes a 30KB+ external CDN dependency from ~199 pages.
//
// AOS direction -> motion.css class:
//   fade-up    -> reveal reveal-up
//   fade-left  -> reveal reveal-left
//   fade-right -> reveal reveal-right
//   zoom-in    -> reveal reveal-zoom
//
// data-aos-delay (ms, arbitrary) -> data-delay (1-5 bucket matching motion.css steps)
// Order-preserving bucketing (higher original delay -> equal or higher bucket):
//   0-40ms -> no data-delay
//   41-120ms  -> 1 (80ms step)
//   121-200ms -> 2 (160ms step)
//   201-280ms -> 3 (240ms step)
//   281-360ms -> 4 (320ms step)
//   361ms+    -> 5 (400ms step)
//
// pricing.html is EXCLUDED: it generates data-aos dynamically via JS string
// concatenation ('...' + delay + '...'), not static HTML, so it needs a
// separate, manual fix — this script would corrupt its JS logic.

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXCLUDE = new Set(['admin.html', 'pricing.html']);

const DIR_MAP = {
  'fade-up':    'reveal reveal-up',
  'fade-left':  'reveal reveal-left',
  'fade-right': 'reveal reveal-right',
  'zoom-in':    'reveal reveal-zoom',
};

function bucketDelay(ms) {
  const n = parseInt(ms, 10);
  if (isNaN(n) || n <= 40) return null;
  if (n <= 120) return '1';
  if (n <= 200) return '2';
  if (n <= 280) return '3';
  if (n <= 360) return '4';
  return '5';
}

function addClass(tag, newClasses) {
  // tag = full opening tag string, e.g. <div class="foo" data-aos="fade-up">
  if (/\bclass="/.test(tag)) {
    return tag.replace(/class="([^"]*)"/, (m, existing) => {
      const merged = (existing.trim() + ' ' + newClasses).trim();
      return `class="${merged}"`;
    });
  }
  // No class attribute yet — insert one right after the tag name
  return tag.replace(/^(<[a-zA-Z0-9]+)/, `$1 class="${newClasses}"`);
}

function migrateFile(content) {
  let changed = false;

  // Process tag-by-tag so we can safely merge class attributes.
  // Match any opening tag that contains data-aos="...".
  content = content.replace(/<[a-zA-Z0-9]+\b[^>]*\bdata-aos="[^"]+"[^>]*>/g, (tag) => {
    const aosMatch = tag.match(/data-aos="([^"]+)"/);
    const delayMatch = tag.match(/data-aos-delay="([^"]+)"/);
    if (!aosMatch) return tag;

    const dir = aosMatch[1];
    const revealClasses = DIR_MAP[dir];
    if (!revealClasses) return tag; // unknown direction, leave untouched (shouldn't happen per audit)

    let newTag = addClass(tag, revealClasses);

    // Strip data-aos and data-aos-delay attributes
    newTag = newTag.replace(/\s*data-aos="[^"]+"/, '');

    if (delayMatch) {
      const bucket = bucketDelay(delayMatch[1]);
      newTag = newTag.replace(/\s*data-aos-delay="[^"]+"/, '');
      if (bucket) {
        // insert data-delay right before the closing >
        newTag = newTag.replace(/>$/, ` data-delay="${bucket}">`);
      }
    }

    changed = true;
    return newTag;
  });

  // Remove AOS CDN <link> (css) — matches the preload+stylesheet pattern used site-wide
  const beforeLink = content;
  content = content.replace(
    /\s*<link rel="preload" href="https:\/\/unpkg\.com\/aos@2\.3\.1\/dist\/aos\.css"[^>]*>(\s*<noscript>[\s\S]*?<\/noscript>)?/g,
    ''
  );
  content = content.replace(
    /\s*<link[^>]*href="https:\/\/unpkg\.com\/aos@2\.3\.1\/dist\/aos\.css"[^>]*>/g,
    ''
  );
  if (content !== beforeLink) changed = true;

  // Remove AOS CDN <script src="...aos.js">
  const beforeScript = content;
  content = content.replace(
    /\s*<script[^>]*src="https:\/\/unpkg\.com\/aos@2\.3\.1\/dist\/aos\.js"[^>]*><\/script>/g,
    ''
  );
  if (content !== beforeScript) changed = true;

  // Remove AOS.init(...) calls (typically inside a small inline <script> block)
  const beforeInit = content;
  // Case 1: AOS.init() is the ONLY statement in its <script> block -> remove whole block
  content = content.replace(
    /\s*<script>\s*AOS\.init\([^)]*\);?\s*<\/script>/g,
    ''
  );
  // Case 2: AOS.init() sits alongside other JS in a shared block -> remove just that line
  content = content.replace(/\s*AOS\.init\([^)]*\);?/g, '');
  if (content !== beforeInit) changed = true;

  return { content, changed };
}

const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && !EXCLUDE.has(f));
let filesChanged = 0;
let totalTagsTouched = 0;

for (const f of files) {
  const full = path.join(ROOT, f);
  const original = fs.readFileSync(full, 'utf8');
  const beforeAosCount = (original.match(/data-aos=/g) || []).length;

  const { content, changed } = migrateFile(original);

  if (changed) {
    fs.writeFileSync(full, content);
    filesChanged++;
    totalTagsTouched += beforeAosCount;
  }
}

console.log(`✅ Migrated ${filesChanged} files, ${totalTagsTouched} data-aos instances converted`);
console.log(`⏭  Skipped (excluded): ${[...EXCLUDE].join(', ')}`);
