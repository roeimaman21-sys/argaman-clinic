/* =====================================================
   article-overrides.js — Live content updates from CRM
   Fetches override from Supabase and applies to article page.
   ===================================================== */
(function(){
  'use strict';

  const path = window.location.pathname;
  const slug = path.split('/').pop().replace('.html','');
  if (!slug || slug === 'index' || slug === '') return;

  const SUPA = 'https://rrvjiudtgooyxpbboary.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJydmppdWR0Z29veXhwYmJvYXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4MjQwMTUsImV4cCI6MjA5NDQwMDAxNX0.3OBWeGyeQF2GlQqe9n8VmXM7uTlY9QYL8JoIIuPG6aA';

  fetch(SUPA + '/rest/v1/argaman_data?key=eq.article_overrides&select=value', {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  })
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (!data || !data[0] || !data[0].value) return;
    const overrides = data[0].value;
    const ov = overrides[slug];
    if (!ov) return;

    // 1. TITLE
    if (ov.title){
      const h1 = document.querySelector('article h1') || document.querySelector('main h1');
      if (h1) h1.textContent = ov.title;
      const titleTag = document.querySelector('title');
      if (titleTag) titleTag.textContent = ov.title + ' | קליניקת ארגמן';
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', ov.title);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', ov.title);
    }

    // 2. EXCERPT / META DESCRIPTION
    if (ov.excerpt){
      const desc = document.querySelector('meta[name="description"]');
      if (desc) desc.setAttribute('content', ov.excerpt);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', ov.excerpt);
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', ov.excerpt);
      // Also update inline excerpt paragraph (the lead paragraph)
      const leadP = document.querySelector('article p[style*="font-size:1.2rem"]') || document.querySelector('article p[style*="color:#1B3A6B"]');
      if (leadP) leadP.textContent = ov.excerpt;
    }

    // 3. CATEGORY BADGE
    if (ov.category){
      const badge = document.querySelector('article .badge') || document.querySelector('article span.badge');
      if (badge) badge.textContent = ov.category;
    }

    // 4. DATE
    if (ov.date){
      const dateSpan = document.querySelector('article .meta span:nth-child(1)') ||
                       [...document.querySelectorAll('article span')].find(s => /📅/.test(s.textContent));
      if (dateSpan) dateSpan.textContent = '📅 ' + new Date(ov.date).toLocaleDateString('he-IL');
    }

    // 5. READ TIME
    if (ov.readTime){
      const readSpan = [...document.querySelectorAll('article span')].find(s => /⏱/.test(s.textContent));
      if (readSpan) readSpan.textContent = '⏱ ' + ov.readTime + ' דק׳ קריאה';
    }

    // 6. WORD COUNT
    if (ov.wordCount){
      const wordSpan = [...document.querySelectorAll('article span')].find(s => /📝.*מילים/.test(s.textContent));
      if (wordSpan) wordSpan.textContent = '📝 ' + ov.wordCount + ' מילים';
    }

    // 7. CONTENT — replace main body
    if (ov.content){
      // Find the main content div (usually the one with font-size:1.1rem)
      let contentDiv = document.querySelector('article > div[style*="font-size:1.1rem"]') ||
                       document.querySelector('article main > div') ||
                       document.querySelector('article div.article-body');
      // If not found, replace everything after meta header
      if (!contentDiv){
        const article = document.querySelector('article');
        if (article){
          // Find the meta header (last header element before body)
          const metaHeader = article.querySelector('div[style*="border-bottom"]') ||
                            [...article.querySelectorAll('div')].find(d => /📅/.test(d.textContent));
          if (metaHeader){
            // Remove everything after meta header
            let next = metaHeader.nextElementSibling;
            while (next && next.tagName !== 'HR' && !next.querySelector('img[alt*="גל"]')){
              const toRemove = next;
              next = next.nextElementSibling;
              toRemove.remove();
            }
            // Insert new content
            const wrap = document.createElement('div');
            wrap.style.cssText = 'font-size:1.1rem;line-height:1.8';
            wrap.innerHTML = ov.content;
            metaHeader.parentNode.insertBefore(wrap, metaHeader.nextSibling);
          }
        }
      } else {
        contentDiv.innerHTML = ov.content;
      }
      console.log('[Article Override] Full content updated from CRM');
    }

    // Featured badge
    if (ov.status === 'featured'){
      const featured = document.createElement('div');
      featured.style.cssText = 'position:fixed;top:80px;left:.75rem;background:#C9A84C;color:#1B3A6B;padding:.3rem .75rem;border-radius:20px;font-weight:700;font-size:.85rem;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15)';
      featured.textContent = '⭐ מאמר מומלץ';
      document.body.appendChild(featured);
    }

    // Dev-mode indicator
    if (location.search.includes('debug=1')){
      const banner = document.createElement('div');
      banner.style.cssText = 'background:#fef3c7;border-right:4px solid #f59e0b;padding:.5rem;text-align:center;font-size:.85rem;color:#854d0e;position:sticky;top:0;z-index:99';
      banner.innerHTML = '✏️ <strong>מצב Debug:</strong> דף זה מציג override מ-CRM. ' + Object.keys(ov).filter(k=>ov[k]&&k!=='updated').join(', ');
      document.body.insertBefore(banner, document.body.firstChild);
    }
  })
  .catch(err => console.warn('[Article Override] Failed:', err));
})();
