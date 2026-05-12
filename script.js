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

  const open  = () => { hamburger.classList.add('open'); drawer.classList.add('open'); overlay && overlay.classList.add('show'); document.body.style.overflow = 'hidden'; hamburger.setAttribute('aria-expanded','true'); };
  const close = () => { hamburger.classList.remove('open'); drawer.classList.remove('open'); overlay && overlay.classList.remove('show'); document.body.style.overflow = ''; hamburger.setAttribute('aria-expanded','false'); };

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
  const form    = document.getElementById('lead-form');
  const success = document.getElementById('lead-success');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();
    if (!email) return;
    localStorage.setItem('argaman_lead_email', email);
    form.classList.add('hidden');
    success && success.classList.add('show');
  });
}

/* =====================================================
   FAQ ACCORDION
   ===================================================== */
function initAccordion() {
  const btns = document.querySelectorAll('.accordion-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const body      = btn.nextElementSibling;
      const expanded  = btn.getAttribute('aria-expanded') === 'true';
      btns.forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const sib = b.nextElementSibling;
        if (sib) sib.classList.remove('open');
      });
      if (!expanded) {
        btn.setAttribute('aria-expanded', 'true');
        body && body.classList.add('open');
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
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted)">לא נמצאו מאמרים</p>';
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

  const placeholder = [
    { id: 1000001, title: 'כיצד לשפר את התקשורת בזוגיות', category: 'זוגיות', excerpt: 'תקשורת היא אחד מאבני היסוד של כל זוגיות בריאה. במאמר זה נסקור כלים מעשיים לשיפור השיח הזוגי.', content: 'תוכן המאמר כאן...', image: '' },
    { id: 1000002, title: 'מיניות ואינטימיות — שאלות ותשובות', category: 'מיניות', excerpt: 'שאלות נפוצות על מיניות ואינטימיות בזוגיות, ותשובות מקצועיות שיעזרו לכם להבין טוב יותר.', content: 'תוכן המאמר כאן...', image: '' },
    { id: 1000003, title: 'ריפוי טראומה — המסע לחיים חדשים', category: 'טראומה', excerpt: 'טראומות מהעבר יכולות להשפיע על חיינו בהווה. כיצד ניתן לעבד אותן ולהתחיל מחדש?', content: 'תוכן המאמר כאן...', image: '' },
  ];
  if (!allArticles.length) { allArticles = placeholder; filtered = placeholder; }

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
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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
    e.preventDefault();
    window.location.href = 'thank-you.html';
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
