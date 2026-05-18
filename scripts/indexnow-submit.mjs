#!/usr/bin/env node
/**
 * indexnow-submit.mjs — Submit URLs to IndexNow API
 * Notifies Bing, Yandex (and Google via Bing) about new/updated content.
 * Run: node scripts/indexnow-submit.mjs [url1] [url2] ...
 * Default: all changed URLs in last commit
 */
import fs from 'fs';
import { execSync } from 'child_process';

const KEY = '2cb3142c4df7fc201f06a800e7796b83';
const HOST = 'argamanclinic.com';
const BASE = 'https://' + HOST;

async function submit(urls){
  if (urls.length === 0){ console.log('No URLs to submit.'); return; }
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${BASE}/${KEY}.txt`,
    urlList: urls
  });
  // Submit to all major search engines
  const endpoints = [
    'https://api.indexnow.org/IndexNow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow'
  ];
  for (const ep of endpoints){
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body
      });
      console.log(`${ep} → ${res.status}`);
    } catch(e){
      console.log(`${ep} → ERROR: ${e.message}`);
    }
  }
}

let urls = process.argv.slice(2);
if (urls.length === 0){
  // Default: get HTML files changed in last commit
  try {
    const changed = execSync('git diff --name-only HEAD~1 HEAD').toString().trim().split('\n');
    urls = changed.filter(f => f.endsWith('.html') && !f.includes('admin.html') && !f.includes('node_modules'))
      .map(f => `${BASE}/${f === 'index.html' ? '' : f}`);
  } catch(_) { /* not a git repo */ }
}
if (urls.length === 0){
  console.log('No URLs provided and no changed HTML files in last commit.');
  console.log('Usage: node scripts/indexnow-submit.mjs https://argamanclinic.com/page1.html [more URLs...]');
  process.exit(0);
}
console.log(`Submitting ${urls.length} URLs to IndexNow:`);
urls.forEach(u => console.log('  - ' + u));
submit(urls);
