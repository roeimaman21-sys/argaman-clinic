/* =====================================================
   קליניקת ארגמן — script.js
   ===================================================== */

'use strict';

/* =====================================================
   ARTICLE MANAGEMENT (localStorage)
   ===================================================== */
const STORAGE_KEY = 'argaman_articles';

function getArticles() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveArticle(article) {
  const articles = getArticles();
  articles.unshift(article);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function updateArticle(id, data) {
  const articles = getArticles();
  const idx = articles.findIndex(a => a.id === id);
  if (idx !== -1) {
    articles[idx] = { ...articles[idx], ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    return true;
  }
  return false;
}

function deleteArticle(id) {
  const articles = getArticles().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function getArticleById(id) {
  return getArticles().find(a => a.id === id) || null;
}

function getLatestArticles(n = 3) {
  return getArticles().slice(0, n);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('he-IL', { year:'numeric', month:'long', day:'numeric' });
}

function readingTime(content) {
  const words = (content || '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200)) + ' דקות קריאה';
}

/* =====================================================
   NAVIGATION
   ===================================================== */
function initStickyNav() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const drawer    = document.querySelector('.mobile-drawer');
  const overlay   = document.querySelector('.overlay');
  const closeBtn  = document.querySelector('.drawer-close');
  if (!hamburger || !drawer) return;

  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'תפריט ניווט');
  const open  = () => { hamburger.classList.add('open'); drawer.classList.add('open'); overlay && overlay.classList.add('show'); document.body.style.overflow = 'hidden'; hamburger.setAttribute('aria-expanded','true'); const firstLink = drawer.querySelector('a,button'); firstLink && firstLink.focus(); };
  const close = () => { hamburger.classList.remove('open'); drawer.classList.remove('open'); overlay && overlay.classList.remove('show'); document.body.style.overflow = ''; hamburger.setAttribute('aria-expanded','false'); hamburger.focus(); };

  hamburger.addEventListener('click', () => drawer.classList.contains('open') ? close() : open());
  closeBtn && closeBtn.addEventListener('click', close);
  overlay  && overlay.addEventListener('click', close);

  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  const onScroll = () => btn.classList.toggle('visible', window.scrollY > 400);
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  onScroll();
}

function setActiveNavLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .drawer-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href === path || (path === '' && href === 'index.html'));
  });
}

/* =====================================================
   LEAD MAGNET (index.html)
   ===================================================== */
function initLeadMagnet() {
  const form = document.getElementById('lead-form');
  if (!form) return;
  form.addEventListener('submit', () => {
    const email = (form.querySelector('input[type="email"]') || {}).value;
    if (email) try { localStorage.setItem('argaman_lead_email', email.trim()); } catch (_) {}
  });
}

/* =====================================================
   FAQ ACCORDION
   ===================================================== */
function initAccordion() {
  const btns = document.querySelectorAll('.accordion-btn');
  btns.forEach(btn => {
    const body = btn.nextElementSibling;
    if (body) body.setAttribute('aria-hidden', 'true');
    btn.addEventListener('click', () => {
      const expanded  = btn.getAttribute('aria-expanded') === 'true';
      btns.forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const sib = b.nextElementSibling;
        if (sib) { sib.classList.remove('open'); sib.setAttribute('aria-hidden', 'true'); }
      });
      if (!expanded) {
        btn.setAttribute('aria-expanded', 'true');
        if (body) { body.classList.add('open'); body.setAttribute('aria-hidden', 'false'); }
      }
    });
  });
}

/* =====================================================
   FILTER (testimonials, videos)
   ===================================================== */
function initFilter(btnSelector, itemSelector, dataAttr) {
  const btns  = document.querySelectorAll(btnSelector);
  const items = document.querySelectorAll(itemSelector);
  if (!btns.length) return;
  btns.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      const filter = btn.dataset.filter || 'all';
      items.forEach(item => {
        const cat = item.dataset[dataAttr] || '';
        item.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
      });
    });
  });
}

function initTestimonialsFilter() { initFilter('.testimonials-filter .filter-btn', '.testimonial-item', 'cat'); }
function initVideosFilter()       { initFilter('.videos-filter .filter-btn',       '.video-item',        'cat'); }

/* =====================================================
   BLOG
   ===================================================== */
const PAGE_SIZE = 9;

function catBadgeClass(cat) {
  const map = { 'זוגיות':'cat-couple','מיניות':'cat-sexual','טראומה':'cat-trauma','אישי':'cat-personal' };
  return map[cat] || '';
}

function buildBlogCard(article) {
  return `
    <article class="card blog-card" data-cat="${article.category || ''}">
      <div class="card-img" style="${article.image ? `background-image:url(${article.image});background-size:cover;background-position:center` : ''}">
        ${!article.image ? '<span style="color:rgba(255,255,255,0.3);font-size:0.8rem">תמונת מאמר</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="cat-badge ${catBadgeClass(article.category)}">${article.category || 'כללי'}</span>
          <span>${formatDate(article.id)}</span>
          <span>${readingTime(article.content)}</span>
        </div>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="card-excerpt">${escapeHtml(article.excerpt || '')}</p>
        <a href="article.html?id=${article.id}" class="card-link">קראו עוד ←</a>
      </div>
    </article>`;
}

function renderBlogGrid(articles, page = 1) {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;
  const start = (page - 1) * PAGE_SIZE;
  const slice = articles.slice(start, start + PAGE_SIZE);

  if (!slice.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:4rem 1rem">
        <div style="font-size:3rem;margin-bottom:1rem">📝</div>
        <h3 style="color:var(--color-primary);margin-bottom:0.5rem">מאמרים בקרוב</h3>
        <p style="color:var(--color-text-muted);max-width:400px;margin:0 auto 1.5rem;line-height:1.7">גל יפרסם כאן מאמרים מקצועיים בנושאי זוגיות, מיניות, טראומה וייעוץ אישי</p>
        <a href="contact.html" class="btn btn-primary">לתיאום שיחת ייעוץ ←</a>
      </div>`;
    return;
  }
  grid.innerHTML = slice.map(buildBlogCard).join('');
}

function initPagination(articles, currentPage, onPageChange) {
  const wrap = document.getElementById('pagination');
  if (!wrap) return;
  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  if (totalPages <= 1) { wrap.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn${i === currentPage ? ' active' : ''}" data-page="${i}" aria-label="עמוד ${i}">${i}</button>`;
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
  });
}

function initBlog() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;

  let allArticles = getArticles();
  let filtered    = allArticles;
  let currentPage = 1;


  function refresh() {
    renderBlogGrid(filtered, currentPage);
    initPagination(filtered, currentPage, page => { currentPage = page; renderBlogGrid(filtered, page); initPagination(filtered, page, arguments.callee); window.scrollTo({ top: grid.offsetTop - 120, behavior: 'smooth' }); });
  }

  const searchInput = document.getElementById('blog-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      filtered = q ? allArticles.filter(a => a.title.toLowerCase().includes(q) || (a.excerpt||'').toLowerCase().includes(q)) : allArticles;
      currentPage = 1;
      refresh();
    });
  }

  const filterBtns = document.querySelectorAll('.blog-filter .filter-btn');
  filterBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      const cat = btn.dataset.filter || 'all';
      filtered = (cat === 'all') ? allArticles : allArticles.filter(a => a.category === cat);
      currentPage = 1;
      if (searchInput) searchInput.value = '';
      refresh();
    });
  });

  refresh();
}

/* =====================================================
   ARTICLE PAGE
   ===================================================== */
function loadArticle() {
  const container = document.getElementById('article-container');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  if (!id) { showArticleError(container); return; }

  const article = getArticleById(id);
  if (!article) { showArticleError(container); return; }

  document.title = `${article.title} | קליניקת ארגמן`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = article.excerpt || article.title;

  const heroTitle = document.getElementById('article-hero-title');
  if (heroTitle) heroTitle.textContent = article.title;

  const metaBar = document.getElementById('article-meta');
  if (metaBar) metaBar.innerHTML = `
    <span class="cat-badge ${catBadgeClass(article.category)}">${article.category || 'כללי'}</span>
    <span>📅 ${formatDate(article.id)}</span>
    <span>⏱ ${readingTime(article.content)}</span>`;

  const body = document.getElementById('article-body');
  if (body) body.innerHTML = article.content.replace(/\n/g, '<br>');

  renderRelatedArticles(id);
}

function showArticleError(container) {
  container.innerHTML = `
    <div style="text-align:center;padding:4rem 1rem">
      <p style="font-size:3rem">😕</p>
      <h2>המאמר לא נמצא</h2>
      <p style="color:var(--color-text-muted);margin:1rem 0">ייתכן שהלינק שגוי או שהמאמר הוסר.</p>
      <a href="blog.html" class="btn btn-primary">לכל המאמרים ←</a>
    </div>`;
}

function renderRelatedArticles(currentId) {
  const wrap = document.getElementById('related-articles');
  if (!wrap) return;
  const related = getArticles().filter(a => a.id !== currentId).slice(0, 3);
  if (!related.length) { wrap.closest('section') && (wrap.closest('section').style.display = 'none'); return; }
  wrap.innerHTML = `<div class="grid-3">${related.map(buildBlogCard).join('')}</div>`;
}

/* =====================================================
   LATEST ARTICLES ON HOME PAGE
   ===================================================== */
function renderLatestArticles() {
  const wrap = document.getElementById('latest-articles');
  if (!wrap) return;
  const articles = getLatestArticles(3);
  if (!articles.length) { wrap.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.6)">מאמרים בקרוב</p>'; return; }
  wrap.innerHTML = `<div class="grid-3">${articles.map(buildBlogCard).join('')}</div>`;
}

/* =====================================================
   ADMIN
   ===================================================== */
function initAdminAuth() {
  const overlay  = document.getElementById('admin-auth-overlay');
  const dashboard= document.getElementById('admin-dashboard');
  if (!overlay) return;

  const PASS = 'argaman2025';
  const SESSION_KEY = 'argaman_admin';

  function unlock() {
    overlay.style.display = 'none';
    dashboard && (dashboard.style.display = '');
    initAdminDashboard();
  }
  function lock() {
    sessionStorage.removeItem(SESSION_KEY);
    overlay.style.display = '';
    dashboard && (dashboard.style.display = 'none');
  }

  if (sessionStorage.getItem(SESSION_KEY) === 'ok') { unlock(); return; }

  const form     = document.getElementById('admin-login-form');
  const errorEl  = document.getElementById('admin-error');

  form && form.addEventListener('submit', e => {
    e.preventDefault();
    const val = form.querySelector('input[type="password"]').value;
    if (val === PASS) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      unlock();
    } else {
      if (errorEl) { errorEl.textContent = 'סיסמה שגויה. נסה שוב.'; errorEl.style.animation = 'none'; requestAnimationFrame(() => errorEl.style.animation = ''); }
    }
  });

  const logoutBtn = document.getElementById('admin-logout');
  logoutBtn && logoutBtn.addEventListener('click', lock);
}

let editingId = null;

function initAdminDashboard() {
  renderArticlesTable();
  initArticleForm();
  updateArticleCount();
  const logoutBtn = document.getElementById('admin-logout');
  logoutBtn && logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('argaman_admin');
    location.reload();
  });
}

function updateArticleCount() {
  const el = document.getElementById('article-count');
  if (el) el.textContent = getArticles().length + ' מאמרים';
}

function renderArticlesTable() {
  const tbody = document.getElementById('articles-tbody');
  if (!tbody) return;
  const articles = getArticles();
  if (!articles.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:2rem">עדיין לא פורסמו מאמרים</td></tr>';
    return;
  }
  tbody.innerHTML = articles.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.title)}</strong></td>
      <td><span class="cat-badge">${escapeHtml(a.category || 'כללי')}</span></td>
      <td style="white-space:nowrap;font-size:0.85rem">${formatDate(a.id)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="adminEditArticle(${a.id})">עריכה</button>
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="adminDeleteArticle(${a.id})">מחק</button>
      </td>
    </tr>`).join('');
}

function adminEditArticle(id) {
  const article = getArticleById(id);
  if (!article) return;
  editingId = id;
  const f = document.getElementById('article-form');
  if (!f) return;
  f.title_field.value    = article.title;
  f.category.value       = article.category || 'זוגיות';
  f.excerpt.value        = article.excerpt || '';
  f.content.value        = article.content || '';
  const submitBtn = document.getElementById('form-submit-btn');
  if (submitBtn) submitBtn.textContent = 'עדכן מאמר';
  const preview = document.getElementById('img-preview');
  if (preview && article.image) { preview.src = article.image; preview.style.display = 'block'; }
  document.getElementById('article-form')?.scrollIntoView({ behavior:'smooth' });
}

function adminDeleteArticle(id) {
  if (!confirm('האם למחוק מאמר זה לצמיתות?')) return;
  deleteArticle(id);
  renderArticlesTable();
  updateArticleCount();
}

function initArticleForm() {
  const form = document.getElementById('article-form');
  if (!form) return;

  const imgInput   = form.querySelector('input[type="file"]');
  const imgPreview = document.getElementById('img-preview');

  imgInput && imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { alert('התמונה גדולה מ-500KB — שקלו לדחוס אותה לפני העלאה.'); }
    const reader = new FileReader();
    reader.onload = e => {
      if (imgPreview) { imgPreview.src = e.target.result; imgPreview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const title    = form.title_field.value.trim();
    const category = form.category.value;
    const excerpt  = form.excerpt.value.trim();
    const content  = form.content.value.trim();
    const image    = imgPreview && imgPreview.style.display !== 'none' ? imgPreview.src : '';
    if (!title || !content) { alert('כותרת ותוכן הם שדות חובה.'); return; }

    if (editingId) {
      updateArticle(editingId, { title, category, excerpt, content, image });
      editingId = null;
      const submitBtn = document.getElementById('form-submit-btn');
      if (submitBtn) submitBtn.textContent = 'פרסם מאמר';
    } else {
      saveArticle({ id: Date.now(), title, category, excerpt, content, image, date: new Date().toISOString() });
    }
    form.reset();
    if (imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
    renderArticlesTable();
    updateArticleCount();
    alert('המאמר נשמר בהצלחה!');
  });
}

/* =====================================================
   CONTACT FORM
   ===================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    const name    = form.querySelector('[name="name"]')?.value.trim();
    const phone   = form.querySelector('[name="phone"]')?.value.trim();
    const privacy = form.querySelector('[name="privacy"]')?.checked;
    if (!name || !phone) {
      e.preventDefault();
      alert('נא למלא שם מלא וטלפון');
      return;
    }
    if (privacy === false) {
      e.preventDefault();
      alert('נא לאשר את מדיניות הפרטיות כדי להמשיך');
      return;
    }
    // Let the form submit naturally to FormSubmit.co
  });
}

/* =====================================================
   UTILS
   ===================================================== */
function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* =====================================================
   COUNTER ANIMATION
   ===================================================== */
function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-count]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const prefix = el.getAttribute('data-prefix') || (el.textContent.startsWith('+') ? '+' : '');
      const duration = 1800;
      const start = performance.now();
      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target;
      }
      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(el => observer.observe(el));
}

/* =====================================================
   MAGNETIC BUTTON EFFECT
   ===================================================== */
function initMagneticButtons() {
  document.querySelectorAll('.btn-wa.btn-lg, .btn-primary.btn-lg').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.1}px, ${y * 0.15}px) translateY(-3px) scale(1.02)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 750, once: true, offset: 60, easing: 'ease-out-cubic' });
  }
  initStickyNav();
  initMobileMenu();
  initBackToTop();
  setActiveNavLink();
  initLeadMagnet();
  initAccordion();
  initTestimonialsFilter();
  initVideosFilter();
  initContactForm();
  renderLatestArticles();
  initBlog();
  loadArticle();
  initAdminAuth();
  initCounters();
  initMagneticButtons();
});

/* =====================================================
   ARTICLE ENHANCEMENTS — TOC, Reading Progress, Reading Time
   Auto-activates on any page containing <article> with 3+ H2s.
   ===================================================== */
function initArticleEnhancements() {
  const article = document.querySelector('article');
  if (!article) return;
  const h2s = article.querySelectorAll('h2');
  if (h2s.length < 3) return;

  // 1. Slugify IDs on H2s for anchor links
  h2s.forEach((h, i) => {
    if (!h.id) h.id = 'sec-' + (i + 1);
  });

  // 2. Reading Time (calculate from word count, Hebrew = ~200 wpm)
  const text = article.innerText || article.textContent || '';
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));

  // 3. Table of Contents — insert after first paragraph
  const toc = document.createElement('nav');
  toc.className = 'article-toc';
  toc.setAttribute('aria-label', 'תוכן עניינים');
  toc.innerHTML = '<details open><summary><strong>📑 תוכן עניינים</strong> · <span style="color:#6b7280;font-weight:400">⏱ ' + minutes + ' דק׳ קריאה</span></summary><ol>' +
    Array.from(h2s).map(h => '<li><a href="#' + h.id + '">' + h.textContent.trim() + '</a></li>').join('') +
    '</ol></details>';
  const firstP = article.querySelector('p');
  if (firstP && firstP.nextSibling) {
    firstP.parentNode.insertBefore(toc, firstP.nextSibling);
  } else {
    article.insertBefore(toc, article.firstChild);
  }

  // 4. Reading Progress Bar (top sticky)
  const bar = document.createElement('div');
  bar.id = 'reading-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  function updateProgress() {
    const rect = article.getBoundingClientRect();
    const total = article.scrollHeight - window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    const pct = total > 0 ? Math.min(100, (scrolled / total) * 100) : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // 5. Smooth scroll for TOC links
  toc.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const t = document.getElementById(id);
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.pushState(null, '', '#' + id); }
  });
}

document.addEventListener('DOMContentLoaded', initArticleEnhancements);

/* =====================================================
   PWA INSTALL PROMPT — gentle, dismissable banner
   ===================================================== */
(function() {
  if (location.pathname.endsWith('/admin.html')) return;
  let deferredPrompt;
  const DISMISS_KEY = 'argaman_pwa_dismissed';
  const SEEN_KEY = 'argaman_pwa_seen_count';

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Only show if not dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && (Date.now() - parseInt(dismissed)) < 1000 * 60 * 60 * 24 * 30) return; // 30 days
    // Count visits: only show after 3rd visit
    const seen = parseInt(localStorage.getItem(SEEN_KEY) || '0') + 1;
    localStorage.setItem(SEEN_KEY, String(seen));
    if (seen < 3) return;
    showInstallBanner();
  });

  function showInstallBanner() {
    if (document.getElementById('pwa-install-banner')) return;
    const b = document.createElement('div');
    b.id = 'pwa-install-banner';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'התקנת אפליקציה');
    b.innerHTML =
      '<div class="pwa-content">' +
        '<div class="pwa-icon">📱</div>' +
        '<div class="pwa-text">' +
          '<strong>התקינו את האפליקציה</strong>' +
          '<small>גישה מהירה למאמרים, קוויז ופניות — בלי דפדפן</small>' +
        '</div>' +
        '<div class="pwa-buttons">' +
          '<button class="pwa-btn-install" id="pwa-install">התקן</button>' +
          '<button class="pwa-btn-dismiss" id="pwa-dismiss" aria-label="סגור">✕</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('pwa-visible'), 100);
    document.getElementById('pwa-install').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (typeof gtag === 'function') gtag('event', 'pwa_prompt_' + outcome);
      deferredPrompt = null;
      hideInstallBanner();
    });
    document.getElementById('pwa-dismiss').addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      hideInstallBanner();
    });
  }

  function hideInstallBanner() {
    const b = document.getElementById('pwa-install-banner');
    if (b) {
      b.classList.remove('pwa-visible');
      setTimeout(() => b.remove(), 300);
    }
  }
})();

/* =====================================================
   EXIT-INTENT LEAD CAPTURE — desktop only, once per visit
   ===================================================== */
(function() {
  if (location.pathname.endsWith('/admin.html') || location.pathname.endsWith('/contact.html') || location.pathname.endsWith('/thank-you.html')) return;
  const SEEN_KEY = 'argaman_exit_intent_shown';
  let shown = false;

  // Only desktop (touch devices have no mouseleave-to-top signal)
  if ('ontouchstart' in window) return;

  // Wait for page to stabilize
  setTimeout(() => {
    document.addEventListener('mouseleave', (e) => {
      if (shown) return;
      if (e.clientY > 5) return; // only top edge
      if (sessionStorage.getItem(SEEN_KEY)) return;
      const dismissed = localStorage.getItem('argaman_exit_dismissed');
      if (dismissed && (Date.now() - parseInt(dismissed)) < 1000 * 60 * 60 * 24 * 7) return; // 7 days
      shown = true;
      sessionStorage.setItem(SEEN_KEY, '1');
      showExitPopup();
    });
  }, 10000); // wait 10s after page load before arming

  function showExitPopup() {
    if (document.getElementById('exit-popup')) return;
    const overlay = document.createElement('div');
    overlay.id = 'exit-popup';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'הצעה לפני שעוזבים');
    overlay.innerHTML =
      '<div class="exit-modal">' +
        '<button class="exit-close" id="exit-close" aria-label="סגור">✕</button>' +
        '<div class="exit-icon">💛</div>' +
        '<h2 class="exit-title">רגע לפני שעוזבים</h2>' +
        '<p class="exit-msg">אם הגעתם הנה — כנראה שמשהו בקשר שלכם מטריד. <strong>שיחת היכרות חינמית של 15 דקות</strong> יכולה לעזור להבין אם תהליך מתאים לכם — בלי התחייבות.</p>' +
        '<div class="exit-actions">' +
          '<a href="https://wa.me/972506415222?text=שלום, הייתי באתר ומעוניין/ת בשיחת היכרות" target="_blank" rel="noopener noreferrer" class="exit-btn-primary" id="exit-wa">📱 שיחת היכרות חינמית</a>' +
          '<a href="quiz.html" class="exit-btn-secondary" id="exit-quiz">📋 או עשו קוויז קודם</a>' +
        '</div>' +
        '<p class="exit-small">לחיצה על "סגור" לא תציג את ההודעה שוב במשך שבוע.</p>' +
      '</div>';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('exit-visible'), 50);

    function close() {
      localStorage.setItem('argaman_exit_dismissed', String(Date.now()));
      overlay.classList.remove('exit-visible');
      setTimeout(() => overlay.remove(), 300);
      if (typeof gtag === 'function') gtag('event', 'exit_intent_dismiss');
    }
    document.getElementById('exit-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.getElementById('exit-wa').addEventListener('click', () => {
      if (typeof gtag === 'function') gtag('event', 'exit_intent_whatsapp');
    });
    document.getElementById('exit-quiz').addEventListener('click', () => {
      if (typeof gtag === 'function') gtag('event', 'exit_intent_quiz');
    });
  }
})();

/* =====================================================
   GA4 CONVERSION EVENTS — automatic tracking
   ===================================================== */
(function() {
  function track(name, params) {
    if (typeof gtag !== 'function') return;
    try { gtag('event', name, params || {}); } catch(e){}
  }

  function init() {
    // WhatsApp click intent
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
      if (a) {
        track('whatsapp_intent', {
          page: location.pathname,
          link_text: a.textContent.trim().slice(0, 60),
          link_url: a.href
        });
      }
    }, true);

    // Phone tap-to-call
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="tel:"]');
      if (a) {
        track('phone_intent', {
          page: location.pathname,
          phone: a.href.replace('tel:', '')
        });
      }
    }, true);

    // Email
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="mailto:"]');
      if (a) track('email_intent', { page: location.pathname });
    }, true);

    // External link
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="http"]');
      if (!a) return;
      if (a.host === location.host) return;
      if (a.href.includes('wa.me') || a.href.includes('whatsapp')) return; // already tracked
      track('external_link', { url: a.href.slice(0, 200), host: a.host });
    }, true);

    // Form submit
    document.addEventListener('submit', e => {
      const f = e.target;
      track('form_submit', {
        page: location.pathname,
        form_id: f.id || 'unnamed',
        action: f.action || '(local)'
      });
    }, true);

    // Article read depth (50% / 75% / 100%)
    let depthTracked = { 50: false, 75: false, 100: false };
    const article = document.querySelector('article');
    if (article) {
      const updateDepth = () => {
        const rect = article.getBoundingClientRect();
        const total = article.scrollHeight - window.innerHeight;
        const scrolled = Math.max(0, -rect.top);
        const pct = total > 0 ? Math.round((scrolled / total) * 100) : 0;
        [50, 75, 100].forEach(threshold => {
          if (pct >= threshold && !depthTracked[threshold]) {
            depthTracked[threshold] = true;
            track('article_read_depth', { depth: threshold, slug: location.pathname });
          }
        });
      };
      window.addEventListener('scroll', () => requestAnimationFrame(updateDepth), { passive: true });
    }

    // Quiz completion (already tracked via gtag inside quiz.html, but ensure)
    if (location.pathname.includes('quiz.html')) {
      track('quiz_started');
    }

    // Time on page milestones (1min, 3min)
    setTimeout(() => track('engaged_1min', { page: location.pathname }), 60000);
    setTimeout(() => track('engaged_3min', { page: location.pathname }), 180000);

    // Trust strip view (homepage only)
    if (document.querySelector('.trust-strip')) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            track('trust_strip_viewed');
            obs.disconnect();
          }
        });
      });
      obs.observe(document.querySelector('.trust-strip'));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ─── PWA Service Worker registration ─── */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Registered:', reg.scope))
      .catch(err => console.log('[PWA] Registration failed:', err));
  });
}
