#!/usr/bin/env node
// Regenerate sitemap.xml based on actual HTML files in root
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const BASE = 'https://argamanclinic.com';
const EXCLUDE = new Set(['404.html','admin.html','article.html','portal.html','thank-you.html','thank-you-guide.html','og-source.html','guide-source.html','zugiyut-test.html','dpa.html']);

function isPublicPage(f){
  if (!f.endsWith('.html')) return false;
  if (EXCLUDE.has(f)) return false;
  return true;
}

function priority(f){
  if (f === 'index.html') return 1.0;
  if (['about.html','services.html','contact.html','workshops.html','prices.html','faq.html','blog.html','process.html'].includes(f)) return 0.95;
  if (f.startsWith('yeutz-') || f.startsWith('tipul-')) return 0.85;  // landing pages
  if (['privacy.html','accessibility.html','glossary.html','author-gal-maman.html'].includes(f)) return 0.4;
  return 0.8;  // articles
}

function changefreq(f){
  if (f === 'index.html') return 'weekly';
  if (f.startsWith('yeutz-') || f.startsWith('tipul-')) return 'monthly';
  if (['privacy.html','accessibility.html'].includes(f)) return 'yearly';
  return 'monthly';
}

const today = new Date().toISOString().slice(0,10);
const files = fs.readdirSync(ROOT).filter(isPublicPage).sort();
const urlBase = (f) => f === 'index.html' ? `${BASE}/` : `${BASE}/${f}`;

const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
];
for (const f of files){
  xml.push('  <url>');
  xml.push(`    <loc>${urlBase(f)}</loc>`);
  xml.push(`    <lastmod>${today}</lastmod>`);
  xml.push(`    <changefreq>${changefreq(f)}</changefreq>`);
  xml.push(`    <priority>${priority(f).toFixed(2)}</priority>`);
  if (f === 'index.html'){
    xml.push('    <image:image><image:loc>https://argamanclinic.com/og-image.jpg</image:loc></image:image>');
    xml.push('    <image:image><image:loc>https://argamanclinic.com/gal.jpg</image:loc></image:image>');
  }
  xml.push('  </url>');
}
xml.push('</urlset>');

fs.writeFileSync('sitemap.xml', xml.join('\n'));
console.log(`✅ sitemap.xml updated — ${files.length} URLs`);
