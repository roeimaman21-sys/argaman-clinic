#!/usr/bin/env node
// Content audit — identify thin pages + generate improvement report
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SKIP = new Set(['admin.html','article.html','404.html','accessibility.html','dpa.html','privacy.html']);
const MIN_WORDS = 500;
const MIN_INTERNAL_LINKS = 5;

function isArticleOrPage(f){
  if (!f.endsWith('.html')) return false;
  if (SKIP.has(f)) return false;
  return true;
}

function wordCount(text){
  return (text.match(/[֐-׿\w]+/g) || []).length;
}

function stripHtml(html){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi,'')
    .replace(/<style[\s\S]*?<\/style>/gi,'')
    .replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ');
}

const reports = [];
const files = fs.readdirSync(ROOT).filter(isArticleOrPage);
for (const f of files){
  const c = fs.readFileSync(path.join(ROOT,f),'utf8');
  const text = stripHtml(c);
  const words = wordCount(text);
  const internalLinks = (c.match(/href=["'](?!http|mailto:|tel:|#|\/\/|javascript:)[^"']+\.html/g) || []).length;
  const hasOG = /og:image/.test(c);
  const hasSchema = /application\/ld\+json/.test(c);
  const issues = [];
  if (words < MIN_WORDS) issues.push(`THIN: ${words} מילים`);
  if (internalLinks < MIN_INTERNAL_LINKS) issues.push(`קישורים פנימיים: ${internalLinks}`);
  if (!hasOG) issues.push('חסר OG image');
  if (!hasSchema) issues.push('חסר Schema.org');
  if (issues.length){
    reports.push({ file: f, words, internalLinks, issues });
  }
}

reports.sort((a,b) => a.words - b.words);
const out = [
  '# Content Audit Report',
  `Generated: ${new Date().toISOString()}`,
  `Total pages scanned: ${files.length}`,
  `Issues found: ${reports.length}`,
  '',
  '## Pages by priority (thinnest first)',
  '',
  '| File | Words | Links | Issues |',
  '|---|---|---|---|',
  ...reports.map(r => `| ${r.file} | ${r.words} | ${r.internalLinks} | ${r.issues.join(', ')} |`)
];
fs.writeFileSync('content-audit-report.md', out.join('\n'));
console.log(`\n✅ Report saved: content-audit-report.md`);
console.log(`Total pages: ${files.length}, with issues: ${reports.length}`);
console.log(`Thinnest 5:`, reports.slice(0,5).map(r=>`${r.file}(${r.words}w)`).join(', '));
