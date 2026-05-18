#!/usr/bin/env node
/**
 * add-related-articles.mjs — Adds "Related Articles" section to each blog article.
 * Topic detected by keywords in filename + meta keywords.
 * Inserts 3 related articles before closing </main>.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

// Category detection — broader topic groups
const CATEGORIES = {
  betrayal:    ['begida', 'aharei-begida', 'lehishaer-aharei-begida', 'lehatzil-zugiyut-aharei-begida'],
  communication: ['sicha', 'medabrim', 'lehavin', 'tikshoret'],
  marriage:    ['hatuna', 'aharei-hatuna', 'lifney-nisuin', 'lifney-hatuna'],
  intimacy:    ['intimi', 'aintimi', 'min', 'hesh', 'minit', 'hesheq'],
  trauma:      ['trauma', 'hahlama', 'aharei-trauma', 'flash', 'ibud'],
  divorce:     ['girushin', 'preda', 'aziva', 'pridot'],
  conflict:    ['konflikt', 'merivot', 'alimim', 'kasha', 'lachatz'],
  growth:      ['gvulot', 'kariera', 'pearey', 'ahava'],
  children:    ['yelidim', 'horim', 'mishpaha']
};

// Article files only (exclude pages, landing pages, templates)
function isArticle(file) {
  if (!file.endsWith('.html')) return false;
  if (['index.html','about.html','contact.html','services.html','workshops.html','prices.html','faq.html','blog.html','privacy.html','accessibility.html','dpa.html','admin.html','article.html','404.html','glossary.html','author-gal-maman.html','guide-source.html','flash-technique.html'].includes(file)) return false;
  if (file.startsWith('yeutz-zugi-')) return false; // landing pages
  if (file.startsWith('madrich-')) return false;
  if (file.startsWith('service-')) return false;
  return true;
}

function detectCategories(filename, content) {
  const cats = new Set();
  const lower = filename.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)){
    for (const kw of keywords){
      if (lower.includes(kw)) { cats.add(cat); break; }
    }
  }
  // Also check meta keywords
  const kwMatch = content.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/);
  if (kwMatch) {
    const kws = kwMatch[1].toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORIES)){
      for (const kw of keywords){
        if (kws.includes(kw)) cats.add(cat);
      }
    }
  }
  return [...cats];
}

function extractTitle(content) {
  const m = content.match(/<title>([^<]+)<\/title>/);
  if (!m) return '';
  return m[1].split('|')[0].trim();
}

function buildRelatedSection(related) {
  const items = related.map(r => `
    <a href="${r.file}" style="display:block;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:1rem;text-decoration:none;color:inherit;transition:all .2s" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,.08)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='';this.style.transform=''">
      <div style="color:#1B3A6B;font-weight:700;line-height:1.4;font-size:1rem">${r.title}</div>
      <div style="color:#6b7280;font-size:.8rem;margin-top:.4rem">קרא עוד ←</div>
    </a>`).join('');
  return `
<!-- RELATED ARTICLES (auto-generated for internal linking + SEO) -->
<section style="max-width:780px;margin:3rem auto 2rem;padding:0 1rem" aria-label="מאמרים קשורים">
  <h2 style="color:#1B3A6B;font-size:1.4rem;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem">📚 מאמרים נוספים שיעניינו אותך</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem">${items}</div>
</section>`;
}

function main() {
  // Phase 1: scan all articles
  const allFiles = fs.readdirSync(ROOT).filter(isArticle);
  console.log(`Scanning ${allFiles.length} articles...`);
  const articleMap = {};
  for (const f of allFiles){
    const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
    articleMap[f] = {
      file: f,
      title: extractTitle(content),
      cats: detectCategories(f, content),
      content
    };
  }

  // Phase 2: for each article, find 3 related by category overlap (different file)
  let updated = 0;
  for (const f of allFiles){
    const me = articleMap[f];
    if (me.cats.length === 0) continue;
    // Skip if already has related section
    if (me.content.includes('RELATED ARTICLES (auto-generated')) continue;

    // Score other articles by category overlap
    const scored = [];
    for (const other of allFiles){
      if (other === f) continue;
      const o = articleMap[other];
      if (o.cats.length === 0) continue;
      const overlap = me.cats.filter(c => o.cats.includes(c)).length;
      if (overlap > 0) scored.push({ ...o, score: overlap });
    }
    scored.sort((a,b) => b.score - a.score);
    const related = scored.slice(0, 3);
    if (related.length < 2) continue; // need at least 2

    const section = buildRelatedSection(related);
    // Inject before closing </main> if present, else before </body>
    let newContent = me.content;
    if (newContent.includes('</main>')){
      newContent = newContent.replace('</main>', `${section}\n</main>`);
    } else if (newContent.includes('<footer')){
      newContent = newContent.replace(/<footer/, `${section}\n<footer`);
    } else {
      newContent = newContent.replace('</body>', `${section}\n</body>`);
    }
    fs.writeFileSync(path.join(ROOT, f), newContent);
    updated++;
    console.log(`✓ ${f} — ${related.length} related links added`);
  }
  console.log(`\n✅ Done: ${updated} articles got related links`);
}

main();
