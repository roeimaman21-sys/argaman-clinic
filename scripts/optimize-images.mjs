#!/usr/bin/env node
/**
 * optimize-images.mjs — Generate WebP versions of all JPGs/PNGs.
 * Requires: npm install sharp (peer dep)
 * Run: node scripts/optimize-images.mjs
 * Skips files already in WebP format or with existing .webp.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '_unused', '_build', '.git', 'scripts', 'tests', 'supabase', '.github']);

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('sharp not installed. Run: npm install sharp');
  process.exit(1);
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile()) yield p;
  }
}

const targets = [...walk(ROOT)].filter(p => /\.(jpe?g|png)$/i.test(p));
console.log(`Found ${targets.length} JPG/PNG files`);

let converted = 0, skipped = 0;
for (const file of targets){
  const webpPath = file.replace(/\.(jpe?g|png)$/i, '.webp');
  if (fs.existsSync(webpPath)){
    skipped++;
    continue;
  }
  try {
    const stats = fs.statSync(file);
    await sharp(file)
      .webp({ quality: 85, effort: 4 })
      .toFile(webpPath);
    const newStats = fs.statSync(webpPath);
    const saved = Math.round((1 - newStats.size/stats.size) * 100);
    console.log(`✓ ${file} → ${path.basename(webpPath)} (${saved}% smaller)`);
    converted++;
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
  }
}
console.log(`\n✅ Done: ${converted} converted, ${skipped} skipped (webp exists)`);
