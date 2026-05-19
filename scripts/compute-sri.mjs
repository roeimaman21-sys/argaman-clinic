#!/usr/bin/env node
/**
 * compute-sri.mjs — Fetch a CDN script and compute its SHA-384 SRI hash.
 * Usage: node scripts/compute-sri.mjs <URL>
 * Output: integrity="sha384-..." crossorigin="anonymous"
 */
import crypto from 'crypto';

const url = process.argv[2];
if (!url){
  console.error('Usage: node scripts/compute-sri.mjs <URL>');
  process.exit(1);
}

try {
  const res = await fetch(url);
  if (!res.ok){
    console.error(`Failed to fetch: HTTP ${res.status}`);
    process.exit(1);
  }
  const text = await res.text();
  const hash = crypto.createHash('sha384').update(text).digest('base64');
  console.log(`integrity="sha384-${hash}" crossorigin="anonymous"`);
  console.log(`\nFile size: ${text.length} bytes`);
  console.log(`URL: ${url}`);
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
