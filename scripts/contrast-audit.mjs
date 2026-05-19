#!/usr/bin/env node
/**
 * contrast-audit.mjs — Scan HTML/CSS files for color contrast issues.
 * Reports text/background pairs with contrast < 4.5:1 (WCAG AA).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules','_unused','_build','.git','scripts','tests','supabase','.github','frontend']);

function* walk(dir){
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.isFile() && /\.(html|css)$/.test(entry.name)) yield p;
  }
}

/** Parse a color string to RGB */
function parseColor(c){
  c = c.trim().toLowerCase();
  // Named colors (basic subset)
  const named = {
    'white':[255,255,255], 'black':[0,0,0], 'red':[255,0,0],
    'green':[0,128,0], 'blue':[0,0,255], 'gray':[128,128,128],
    'grey':[128,128,128]
  };
  if (named[c]) return named[c];
  // Hex
  if (c.startsWith('#')){
    const h = c.slice(1);
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  // rgb()/rgba()
  const m = c.match(/rgba?\((\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}

/** Relative luminance per WCAG */
function luminance([r, g, b]){
  const norm = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  });
  return 0.2126*norm[0] + 0.7152*norm[1] + 0.0722*norm[2];
}

function contrastRatio(c1, c2){
  const L1 = luminance(c1), L2 = luminance(c2);
  return (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
}

// Extract color/background pairs from a stylesheet/inline style
function extractPairs(content){
  const pairs = [];
  // Match style="color: X; background: Y" or similar
  const styleAttrs = content.matchAll(/style="([^"]+)"/g);
  for (const m of styleAttrs){
    const decl = m[1];
    const color = decl.match(/(?<![\w-])color\s*:\s*([^;]+)/);
    const bg = decl.match(/background(?:-color)?\s*:\s*([^;]+)/);
    if (color && bg){
      pairs.push({ fg: color[1].trim(), bg: bg[1].trim(), context: m[0].slice(0,80) });
    }
  }
  // CSS rules
  const cssRules = content.matchAll(/([^{}]+)\{([^{}]+)\}/g);
  for (const rule of cssRules){
    const decl = rule[2];
    const color = decl.match(/(?<![\w-])color\s*:\s*([^;]+)/);
    const bg = decl.match(/background(?:-color)?\s*:\s*([^;]+)/);
    if (color && bg){
      pairs.push({ fg: color[1].trim(), bg: bg[1].trim(), context: rule[1].trim().slice(0,80) });
    }
  }
  return pairs;
}

const files = [...walk(ROOT)];
const issues = [];
for (const file of files){
  const content = fs.readFileSync(file, 'utf8');
  const pairs = extractPairs(content);
  for (const p of pairs){
    const fgRgb = parseColor(p.fg);
    const bgRgb = parseColor(p.bg);
    if (!fgRgb || !bgRgb) continue;
    const ratio = contrastRatio(fgRgb, bgRgb);
    if (ratio < 4.5){
      issues.push({ file: path.relative(ROOT, file), ratio: ratio.toFixed(2), fg: p.fg, bg: p.bg, context: p.context });
    }
  }
}

const out = [
  '# Color Contrast Audit Report',
  `Generated: ${new Date().toISOString()}`,
  `Files scanned: ${files.length}`,
  `Issues (contrast < 4.5:1): ${issues.length}`,
  '',
  '## Issues',
  ''
];
if (issues.length === 0){
  out.push('🎉 No contrast issues detected!');
} else {
  out.push('| File | Ratio | FG | BG | Context |');
  out.push('|---|---|---|---|---|');
  for (const i of issues.slice(0, 100)){
    out.push(`| ${i.file} | ${i.ratio}:1 | \`${i.fg}\` | \`${i.bg}\` | \`${i.context.replace(/\|/g,'\\|')}\` |`);
  }
  if (issues.length > 100) out.push(`\n_+${issues.length-100} more issues._`);
}

fs.writeFileSync('accessibility-report.md', out.join('\n'));
console.log(`\n✅ Report: accessibility-report.md`);
console.log(`Files: ${files.length}, Issues: ${issues.length}`);
if (issues.length > 0){
  console.log('Top 5 worst:');
  issues.sort((a,b) => +a.ratio - +b.ratio).slice(0,5).forEach(i =>
    console.log(`  ${i.ratio}:1  ${i.fg} on ${i.bg}  → ${i.file}`));
}
