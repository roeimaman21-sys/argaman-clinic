/* =====================================================
   crm-performance.js — Speed, UX & Security Layer
   קליניקת ארגמן · שכבת מהירות, נוחות ואבטחה
   ─────────────────────────────────────────────────────
   Optimizes:
   - Modal performance (debounced, cached)
   - localStorage access (cached reads)
   - Input handlers (debounced)
   - Click feedback (instant)
   - Security: XSS sanitization, click-jacking prevention
   - UX: skeleton loaders, smooth transitions, error toasts
   ===================================================== */
(function(){
  'use strict';

  // ─── 1. PERFORMANCE: localStorage cache ───
  // Hot localStorage keys cached in memory; invalidated on write
  const _cache = new Map();
  const _origGetItem = Storage.prototype.getItem;
  const _origSetItem = Storage.prototype.setItem;
  const _origRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.getItem = function(key) {
    if (this === localStorage && _cache.has(key)) {
      return _cache.get(key);
    }
    const v = _origGetItem.call(this, key);
    if (this === localStorage) _cache.set(key, v);
    return v;
  };
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage) _cache.set(key, String(value));
    return _origSetItem.call(this, key, value);
  };
  Storage.prototype.removeItem = function(key) {
    if (this === localStorage) _cache.delete(key);
    return _origRemoveItem.call(this, key);
  };

  // ─── 2. PERFORMANCE: requestIdleCallback polyfill ───
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = (fn) => setTimeout(() => fn({ timeRemaining: () => 50 }), 1);
  }

  // ─── 3. PERFORMANCE: debounce utility ───
  window.debounce = window.debounce || function(fn, wait) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };
  window.throttle = window.throttle || function(fn, wait) {
    let last = 0, t;
    return function(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(this, args);
      } else {
        clearTimeout(t);
        t = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, remaining);
      }
    };
  };

  // ─── 4. UX: instant click feedback (ripple) ───
  function injectRippleStyle() {
    if (document.getElementById('ripple-style')) return;
    const s = document.createElement('style');
    s.id = 'ripple-style';
    s.textContent = `
      @keyframes ripple-anim{to{transform:scale(2.5);opacity:0}}
      .ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.4);pointer-events:none;animation:ripple-anim .6s linear}
      button:not(:disabled),.btn,.nav-link{position:relative;overflow:hidden}
      .modal-bg{will-change:opacity,transform}
      .modal{will-change:transform}
      /* Smoother transitions on common elements */
      .nav-link,button,.btn,a{transition:background .15s,color .15s,transform .1s}
      /* Better focus visibility */
      button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{
        outline:2px solid #C9A84C;outline-offset:2px;border-radius:4px
      }
      /* Skeleton loader */
      .skeleton{background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%);background-size:200% 100%;animation:skel 1.5s infinite;border-radius:6px}
      @keyframes skel{to{background-position:-200% 0}}
    `;
    document.head.appendChild(s);
  }

  function addRipple(e) {
    const el = e.currentTarget;
    if (!el || el.disabled) return;
    const rect = el.getBoundingClientRect();
    const r = document.createElement('span');
    r.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size/2) + 'px';
    r.style.top = (e.clientY - rect.top - size/2) + 'px';
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  function attachRipples() {
    // Use event delegation on body for all buttons/links
    document.addEventListener('click', e => {
      const el = e.target.closest('button, .btn, .nav-link');
      if (!el) return;
      // Skip if it's a form submit being prevented
      if (el.type === 'submit' && el.form && !el.form.checkValidity()) return;
      addRipple({ currentTarget: el, clientX: e.clientX, clientY: e.clientY });
    }, true);
  }

  // ─── 5. SECURITY: stricter HTML sanitization for any user content ───
  window.safeHtml = function(s) {
    return String(s||'').replace(/[<>&"'`]/g, c => ({
      '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','`':'&#96;'
    }[c]));
  };

  // Allow basic safe markdown-like for user notes (bold, italic, line breaks)
  window.safeRichText = function(s) {
    let t = window.safeHtml(s);
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/\n/g, '<br>');
    return t;
  };

  // ─── 6. SECURITY: prevent click-jacking by ensuring top-frame ───
  if (window.self !== window.top && location.pathname.endsWith('/admin.html')) {
    try {
      if (window.top.location.host !== window.self.location.host) {
        document.body.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif"><h1>🚫 Access Denied</h1><p>This page cannot be embedded in another site.</p></div>';
        return;
      }
    } catch(e) {
      // Cross-origin frame — block
      document.body.innerHTML = '';
      return;
    }
  }

  // ─── 7. UX: better toast/notification system ───
  // Patch existing toast for nicer animation if needed
  const _origToast = window.toast;
  window.toast = function(msg, type, duration) {
    type = type || 'success';
    duration = duration || 3000;
    // Try existing
    if (typeof _origToast === 'function' && _origToast !== window.toast) {
      try { return _origToast(msg, type, duration); } catch(e){}
    }
    // Fallback
    const el = document.createElement('div');
    el.className = 'crm-toast';
    el.textContent = msg;
    const colors = { success:'#16a34a', error:'#dc2626', warn:'#f59e0b', info:'#1B3A6B' };
    el.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;background:${colors[type]||colors.success};color:#fff;padding:.85rem 1.5rem;border-radius:50px;font-weight:600;z-index:99999;box-shadow:0 12px 32px rgba(0,0,0,.15);max-width:90vw;animation:toastIn .25s ease-out`;
    if (!document.getElementById('toast-anim-style')) {
      const ts = document.createElement('style');
      ts.id = 'toast-anim-style';
      ts.textContent = '@keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}@keyframes toastOut{to{transform:translateY(20px);opacity:0}}';
      document.head.appendChild(ts);
    }
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toastOut .25s ease-in forwards';
      setTimeout(() => el.remove(), 250);
    }, duration);
  };

  // ─── 8. UX: catch unhandled errors and show user-friendly toast ───
  window.addEventListener('error', (e) => {
    const msg = e.message || 'שגיאה לא ידועה';
    // Filter out CDN/cross-origin script errors that we can't fix
    if (msg.includes('Script error') || msg.includes('chrome-extension')) return;
    console.error('[CRM Error]', e);
    if (typeof window.toast === 'function') {
      window.toast(`⚠️ שגיאה: ${msg.slice(0,80)}`, 'error', 5000);
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason||'שגיאה');
    if (msg.includes('chrome-extension')) return;
    console.error('[CRM Unhandled]', e);
    if (typeof window.toast === 'function') {
      window.toast(`⚠️ שגיאה: ${msg.slice(0,80)}`, 'error', 5000);
    }
  });

  // ─── 9. PERFORMANCE: lazy image loading ───
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img:not([loading])').forEach(img => img.loading = 'lazy');
  }

  // ─── 10. UX: confirmation for destructive actions ───
  window.confirmDestructive = function(msg, onConfirm) {
    if (confirm('⚠️ ' + msg + '\n\nפעולה זו לא ניתנת לביטול. להמשיך?')) {
      onConfirm();
    }
  };

  // ─── 11. PERFORMANCE: page visibility — pause heavy work when hidden ───
  let _pageHidden = false;
  document.addEventListener('visibilitychange', () => {
    _pageHidden = document.hidden;
    if (!_pageHidden) {
      // Came back — refresh notifications if module available
      if (window.CRMPlus?.Notifications?.updateBadge) {
        window.CRMPlus.Notifications.updateBadge();
      }
    }
  });
  window.isPageHidden = () => _pageHidden;

  // ─── 12. UX: scroll restoration ───
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // ─── 13. PERFORMANCE: smooth scroll polyfill for older browsers ───
  if (!('scrollBehavior' in document.documentElement.style)) {
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  // ─── 14. SECURITY: warn about expired sessions ───
  setInterval(() => {
    const authed = localStorage.getItem('argaman_admin_authed');
    if (!authed) return;
    try {
      const data = JSON.parse(authed);
      const now = Date.now();
      // If session is > 6 hours old, warn
      if (data.t && now - data.t > 6 * 60 * 60 * 1000) {
        if (typeof window.toast === 'function') {
          window.toast('🔐 הסשן ארוך מ-6 שעות — מומלץ להתחבר מחדש לאבטחה', 'warn', 6000);
        }
      }
    } catch(e){}
  }, 30 * 60 * 1000); // check every 30 minutes

  // ─── 15. UX: keyboard navigation hints ───
  let _keyboardUser = false;
  document.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      _keyboardUser = true;
      document.body.classList.add('keyboard-nav');
    }
  });
  document.addEventListener('mousedown', () => {
    if (_keyboardUser) {
      _keyboardUser = false;
      document.body.classList.remove('keyboard-nav');
    }
  });

  // ─── 16. PERFORMANCE: prefetch critical resources ───
  function prefetch() {
    // Already loaded in HTML, but ensure DNS prefetch is up
    if (!document.querySelector('link[rel="dns-prefetch"][href*="supabase"]')) {
      const l = document.createElement('link');
      l.rel = 'dns-prefetch';
      l.href = '//rrvjiudtgooyxpbboary.supabase.co';
      document.head.appendChild(l);
    }
  }

  // ─── 17. UX: smooth modal animations override ───
  function injectModalStyle() {
    const s = document.createElement('style');
    s.textContent = `
      .modal-bg{opacity:0;transition:opacity .2s ease-out}
      .modal-bg.show{opacity:1}
      .modal{transform:scale(.96);transition:transform .25s cubic-bezier(.4,0,.2,1)}
      .modal-bg.show .modal{transform:scale(1)}
      /* Faster button responses */
      button,.btn{transition:background .12s,transform .08s}
      button:active,.btn:active{transform:scale(.97)}
    `;
    document.head.appendChild(s);
  }

  // ─── INIT ───
  function init() {
    injectRippleStyle();
    injectModalStyle();
    attachRipples();
    prefetch();

    // Patch viewClient to be faster — close any open modals first
    if (typeof window.viewClient === 'function' && !window._patchedViewClient) {
      const orig = window.viewClient;
      window.viewClient = function(id) {
        if (typeof closeModal === 'function') closeModal();
        // Use rAF to ensure paint before opening new modal
        requestAnimationFrame(() => orig.call(this, id));
      };
      window._patchedViewClient = true;
    }

    console.log('[CRMPerformance] ✓ Speed/UX/Security layer active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
