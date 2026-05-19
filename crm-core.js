/* =====================================================
   crm-core.js — Unified CRM Foundation
   קליניקת ארגמן · תשתית משותפת לכל מודולי ה-CRM
   ─────────────────────────────────────────────────────
   Loaded FIRST (before all other crm-*.js modules).
   Exposes window.CRM namespace with:
   - Formatters (esc, fmt, ils, uid, ...)
   - Unified Modal stack with Esc handling
   - Toast/Audit/Confirm delegated to existing admin helpers
   - localStorage JSON cache (lazy parse, invalidates on write)
   - Event delegation system
   - State access wrappers
   - UI component factory (CRM.ui)
   - Module registry
   - Module readiness gate (CRM.ready)
   ===================================================== */
(function(){
  'use strict';
  if (window.CRM) return; // singleton

  // ─────────────────────────────────────────────────────
  // 1. FORMATTERS / STRINGS
  // ─────────────────────────────────────────────────────
  const _HTML_ESC = { '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;', '`':'&#96;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"'`]/g, c => _HTML_ESC[c]); }
  function safeAttr(s) { return String(s == null ? '' : s).replace(/[<>&"'`\n\r]/g, c => _HTML_ESC[c] || ''); }

  function fmt(d) {
    if (!d) return '—';
    const x = new Date(d);
    return isNaN(x) ? String(d) : x.toLocaleDateString('he-IL');
  }
  function fmtDt(d) {
    if (!d) return '—';
    const x = new Date(d);
    return isNaN(x) ? String(d) : x.toLocaleString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  function fmtMonth(d) {
    if (!d) return '—';
    const x = new Date(d);
    return isNaN(x) ? String(d) : x.toLocaleDateString('he-IL', { month:'short', year:'2-digit' });
  }
  function fmtTime(t) { return t || '—'; }

  function ils(n) {
    return '₪' + Math.round(Number(n || 0)).toLocaleString('he-IL');
  }
  function pct(n, digits = 0) {
    return (Number(n || 0) * 100).toFixed(digits) + '%';
  }
  function uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function nowISO() { return new Date().toISOString(); }
  function monthKey(d) {
    const x = d instanceof Date ? d : new Date(d);
    return isNaN(x) ? '' : x.toISOString().slice(0, 7);
  }

  // ─────────────────────────────────────────────────────
  // 2. DOM HELPERS
  // ─────────────────────────────────────────────────────
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v == null || v === false) return;
        if (k === 'className' || k === 'class') n.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(n.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') n.innerHTML = v;
        else if (k === 'text') n.textContent = v;
        else n.setAttribute(k, v);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null || c === false) return;
        if (typeof c === 'string' || typeof c === 'number') n.appendChild(document.createTextNode(String(c)));
        else if (c instanceof Node) n.appendChild(c);
      });
    }
    return n;
  }

  // ─────────────────────────────────────────────────────
  // 3. EVENT DELEGATION
  // ─────────────────────────────────────────────────────
  // Single delegated handler per (root, event) — modules register handlers via data-action selectors.
  const _delegatedRoots = new WeakMap();
  function delegate(root, selector, event, handler) {
    if (!root) return;
    let perRootMap = _delegatedRoots.get(root);
    if (!perRootMap) {
      perRootMap = new Map();
      _delegatedRoots.set(root, perRootMap);
    }
    let perEvent = perRootMap.get(event);
    if (!perEvent) {
      perEvent = [];
      perRootMap.set(event, perEvent);
      root.addEventListener(event, (e) => {
        for (const { sel, fn } of perEvent) {
          const target = e.target.closest(sel);
          if (target && root.contains(target)) {
            try { fn(e, target); } catch(err) { console.error('[CRM.delegate]', err); }
            if (e.cancelBubble) break;
          }
        }
      });
    }
    perEvent.push({ sel: selector, fn: handler });
  }

  // ─────────────────────────────────────────────────────
  // 4. localStorage JSON CACHE
  // ─────────────────────────────────────────────────────
  // Avoids repeated JSON.parse for hot keys. Invalidates on write.
  const _jsonCache = new Map(); // key → { raw, parsed }

  function lsGet(key, fallback) {
    try { return localStorage.getItem(key) ?? (fallback === undefined ? null : fallback); }
    catch { return fallback === undefined ? null : fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, String(value)); _jsonCache.delete(key); }
    catch(e) { console.warn('[CRM.ls.set]', e); }
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); _jsonCache.delete(key); }
    catch(e) {}
  }
  function lsGetJSON(key, fallback) {
    let raw;
    try { raw = localStorage.getItem(key); }
    catch { return fallback; }
    if (raw == null) return fallback;
    const cached = _jsonCache.get(key);
    if (cached && cached.raw === raw) return cached.parsed;
    try {
      const parsed = JSON.parse(raw);
      _jsonCache.set(key, { raw, parsed });
      return parsed;
    } catch {
      return fallback;
    }
  }
  function lsSetJSON(key, value) {
    try {
      const raw = JSON.stringify(value);
      localStorage.setItem(key, raw);
      _jsonCache.set(key, { raw, parsed: value });
    } catch(e) { console.warn('[CRM.ls.setJSON]', e); }
  }

  // ─────────────────────────────────────────────────────
  // 4.5 MEMOIZATION (for hot sort/filter paths)
  // ─────────────────────────────────────────────────────
  const _memoCache = new Map();
  function memo(keyFn, computeFn){
    const key = typeof keyFn === 'function' ? keyFn() : String(keyFn);
    if (_memoCache.has(key)) return _memoCache.get(key);
    const result = computeFn();
    _memoCache.set(key, result);
    // Cap cache size
    if (_memoCache.size > 100){
      const firstKey = _memoCache.keys().next().value;
      _memoCache.delete(firstKey);
    }
    return result;
  }
  function invalidateMemo(prefix){
    if (!prefix) return _memoCache.clear();
    for (const k of _memoCache.keys()){
      if (k.startsWith(prefix)) _memoCache.delete(k);
    }
  }

  // ─────────────────────────────────────────────────────
  // 5. STATE WRAPPERS
  // ─────────────────────────────────────────────────────
  const state = {
    sessions() { return (window.State && window.State.sessions) || []; },
    clients()  { return (window.State && window.State.clients)  || []; },
    leads()    { return (window.State && window.State.leads)    || []; },
    articles() { return (window.State && window.State.articles) || []; },
    settings() { return (window.State && window.State.settings) || {}; },
    save(key, value) {
      // Uses existing global save(LS[key], value) from admin.html
      if (typeof window.save !== 'function' || !window.LS || !window.LS[key]) {
        console.warn('[CRM.state.save] save() or LS not available; key=' + key);
        return false;
      }
      window.save(window.LS[key], value);
      return true;
    }
  };

  // ─────────────────────────────────────────────────────
  // 6. UNIFIED MODAL STACK
  // ─────────────────────────────────────────────────────
  // Wraps existing admin.html modal()/openModal() and tracks an internal stack.
  // - Esc closes only the topmost modal
  // - Programmatic close(id) closes specific
  // - z-index auto-incremented per nesting
  // - onClose callback supported
  const _modalStack = []; // { id, element, onClose }

  function _getNativeOpen() {
    if (typeof window.openModal === 'function') return window.openModal;
    if (typeof window.modal === 'function') return (title, content, opts) =>
      window.modal(content, Object.assign({ title, size: 'lg' }, opts || {}));
    return null;
  }

  function modalOpen(title, content, opts) {
    opts = opts || {};
    const open = _getNativeOpen();
    if (!open) {
      console.warn('[CRM.Modal.open] no native modal() — falling back to alert');
      alert((title || '') + '\n\n' + String(content || '').replace(/<[^>]+>/g, ' ').slice(0, 500));
      return null;
    }
    const id = uid('m');
    // Mark next modal element with id for tracking
    const before = document.querySelectorAll('.modal-bg').length;
    open(title, content, opts);
    // Find newly added modal
    requestAnimationFrame(() => {
      const bgs = document.querySelectorAll('.modal-bg');
      const newBg = bgs[bgs.length - 1];
      if (newBg && bgs.length > before) {
        newBg.dataset.crmModalId = id;
        // Bump z-index for nested modals
        if (_modalStack.length > 0) {
          newBg.style.zIndex = String(1000 + _modalStack.length);
        }
        _modalStack.push({ id, element: newBg, onClose: opts.onClose });
      }
    });
    return id;
  }

  function modalClose(id) {
    if (!id) return modalCloseTop();
    const idx = _modalStack.findIndex(m => m.id === id);
    if (idx < 0) return false;
    const m = _modalStack.splice(idx, 1)[0];
    if (m.element && m.element.parentNode) m.element.remove();
    if (typeof m.onClose === 'function') try { m.onClose(); } catch(e){}
    return true;
  }

  function modalCloseTop() {
    if (!_modalStack.length) {
      // Defensive: remove any stray .modal-bg elements
      document.querySelectorAll('.modal-bg').forEach(b => b.remove());
      return false;
    }
    return modalClose(_modalStack[_modalStack.length - 1].id);
  }

  function modalCloseAll() {
    while (_modalStack.length) modalCloseTop();
    // Belt-and-suspenders
    document.querySelectorAll('.modal-bg').forEach(b => b.remove());
  }

  // Esc handler — closes only topmost
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!_modalStack.length) return;
    // Don't close if user is typing in an input/textarea/select inside the modal
    const active = document.activeElement;
    if (active && active.matches('input, textarea, select, [contenteditable="true"]')) {
      // Allow Esc to blur the field instead
      active.blur();
      e.preventDefault();
      return;
    }
    modalCloseTop();
    e.preventDefault();
  });

  // Cleanup stack when external code closes modals (e.g., the modal's X button)
  // We monitor with a periodic check (cheap, runs only when modals exist)
  setInterval(() => {
    if (!_modalStack.length) return;
    for (let i = _modalStack.length - 1; i >= 0; i--) {
      const m = _modalStack[i];
      if (!m.element || !m.element.isConnected) {
        _modalStack.splice(i, 1);
        if (typeof m.onClose === 'function') try { m.onClose(); } catch(e){}
      }
    }
  }, 500);

  const Modal = {
    open: modalOpen,
    close: modalClose,
    closeTop: modalCloseTop,
    closeAll: modalCloseAll,
    get stack() { return _modalStack.slice(); }
  };

  // ─────────────────────────────────────────────────────
  // 7. TOAST / AUDIT / CONFIRM
  // ─────────────────────────────────────────────────────
  function toast(msg, type, duration) {
    type = type || 'success';
    if (typeof window.toast === 'function' && window.toast !== toast) {
      try { return window.toast(msg, type, duration); } catch(e){}
    }
    // Fallback
    const t = el('div', {
      style: {
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        background: type === 'error' ? '#dc2626' : type === 'warn' ? '#f59e0b' : '#16a34a',
        color: '#fff', padding: '.85rem 1.5rem', borderRadius: '50px',
        fontWeight: '600', zIndex: '99999', boxShadow: '0 12px 32px rgba(0,0,0,.15)'
      },
      text: msg
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration || 3000);
  }

  function audit(action, details) {
    // Delegate to CRMPlus.Security if available
    if (window.CRMPlus && window.CRMPlus.Security && typeof window.CRMPlus.Security.log === 'function') {
      return window.CRMPlus.Security.log(action, details);
    }
    // Fallback direct write
    try {
      const log = lsGetJSON('argaman_audit_log', []);
      log.push({ t: nowISO(), action, details: details || {} });
      lsSetJSON('argaman_audit_log', log.slice(-1000));
    } catch(e) {}
  }

  function confirmDestructive(msg, onYes) {
    if (confirm('⚠️ ' + msg + '\n\nפעולה זו לא ניתנת לביטול. להמשיך?')) {
      if (typeof onYes === 'function') onYes();
    }
  }

  // ─────────────────────────────────────────────────────
  // 8. LOADING / ASYNC WRAPPERS
  // ─────────────────────────────────────────────────────
  function withLoading(promise, container, label) {
    label = label || 'טוען...';
    const c = typeof container === 'string' ? document.getElementById(container) : container;
    if (c) {
      c.innerHTML = `<div style="text-align:center;padding:2.5rem 1rem">
        <div style="display:inline-block;width:36px;height:36px;border:4px solid #f3f4f6;border-top-color:#1B3A6B;border-radius:50%;animation:crmspin .8s linear infinite"></div>
        <p style="margin-top:.75rem;color:#6b7280">${esc(label)}</p>
        <style>@keyframes crmspin{to{transform:rotate(360deg)}}</style>
      </div>`;
    }
    return Promise.resolve(promise).catch(err => {
      console.error('[CRM.withLoading]', err);
      if (c) c.innerHTML = `<div style="background:#fee2e2;padding:1rem;border-radius:8px;color:#991b1b">⚠️ ${esc(err.message || 'שגיאה')}</div>`;
      throw err;
    });
  }

  // ─────────────────────────────────────────────────────
  // 9. UI COMPONENT FACTORY
  // ─────────────────────────────────────────────────────
  const _btnStyles = {
    primary:   { bg:'#1B3A6B', color:'#fff', border:'0' },
    secondary: { bg:'#eff4ff', color:'#1B3A6B', border:'1px solid #1B3A6B' },
    success:   { bg:'#16a34a', color:'#fff', border:'0' },
    danger:    { bg:'#dc2626', color:'#fff', border:'0' },
    warn:      { bg:'#f59e0b', color:'#fff', border:'0' },
    ghost:     { bg:'#f3f4f6', color:'#374151', border:'0' },
    gold:      { bg:'#C9A84C', color:'#1B3A6B', border:'0' },
    wa:        { bg:'#25D366', color:'#fff', border:'0' }
  };
  const _btnSizes = {
    xs: { padding:'.25rem .6rem', fontSize:'.75rem' },
    sm: { padding:'.4rem .9rem',  fontSize:'.85rem' },
    md: { padding:'.55rem 1.25rem', fontSize:'.95rem' },
    lg: { padding:'.75rem 1.75rem', fontSize:'1rem' }
  };
  function btn(text, onClick, opts) {
    opts = opts || {};
    const type = _btnStyles[opts.type] || _btnStyles.primary;
    const size = _btnSizes[opts.size] || _btnSizes.md;
    const style = `background:${type.bg};color:${type.color};border:${type.border};padding:${size.padding};border-radius:${opts.round?'50px':'8px'};cursor:pointer;font-weight:600;font-size:${size.fontSize};font-family:inherit;transition:transform .08s,filter .15s`;
    const onClickAttr = typeof onClick === 'string' ? `onclick="${onClick}"` : '';
    const handler = typeof onClick === 'function' ? onClick : null;
    const html = `<button type="button" style="${style}" ${onClickAttr}${opts.disabled?' disabled':''}${opts.ariaLabel?` aria-label="${safeAttr(opts.ariaLabel)}"`:''}${opts.dataAction?` data-action="${safeAttr(opts.dataAction)}"`:''}${opts.dataset?Object.entries(opts.dataset).map(([k,v])=>` data-${k}="${safeAttr(v)}"`).join(''):''}>${text}</button>`;
    if (handler) {
      // Returns the HTML; caller responsible for wiring or use opts.dataAction with delegate()
      return html;
    }
    return html;
  }
  function iconBtn(icon, onClick, ariaLabel, opts) {
    opts = Object.assign({}, opts || {}, { ariaLabel, size: opts && opts.size || 'sm' });
    return btn(icon, onClick, opts);
  }
  function kpi(label, value, sub, color) {
    color = color || '#1B3A6B';
    return `<div style="background:#fff;border:1px solid #e5e7eb;padding:1rem;border-radius:12px">
      <div style="font-size:.8rem;color:#6b7280">${esc(label)}</div>
      <div style="font-size:1.8rem;font-weight:800;color:${color};line-height:1.1">${value}</div>
      ${sub ? `<div style="font-size:.75rem;color:#6b7280;margin-top:.25rem">${esc(sub)}</div>` : ''}
    </div>`;
  }
  function emptyState(icon, title, desc, ctaHtml) {
    return `<div style="text-align:center;padding:3rem 1.5rem;background:#f9fafb;border-radius:12px">
      <div style="font-size:4rem;opacity:.4;margin-bottom:1rem">${icon}</div>
      <h3 style="color:#1B3A6B;margin-bottom:.5rem">${esc(title)}</h3>
      <p style="color:#6b7280;margin-bottom:${ctaHtml?'1.5rem':'0'}">${esc(desc)}</p>
      ${ctaHtml || ''}
    </div>`;
  }
  function errorBox(err) {
    return `<div style="background:#fee2e2;border-right:4px solid #dc2626;padding:1.25rem;border-radius:8px">
      <h3 style="color:#991b1b;margin-bottom:.5rem">⚠️ שגיאה</h3>
      <p style="color:#7f1d1d;font-size:.9rem">${esc(err.message || err)}</p>
      ${err.stack ? `<details style="margin-top:.5rem"><summary style="cursor:pointer;color:#6b7280;font-size:.85rem">פרטים טכניים</summary><pre style="background:#fff;padding:.5rem;border-radius:4px;margin-top:.4rem;font-size:.75rem;overflow:auto;max-height:200px">${esc(err.stack)}</pre></details>` : ''}
    </div>`;
  }
  function loadingHTML(label) {
    return `<div style="text-align:center;padding:3rem 1rem">
      <div style="display:inline-block;width:40px;height:40px;border:4px solid #f3f4f6;border-top-color:#1B3A6B;border-radius:50%;animation:crmspin .8s linear infinite"></div>
      <p style="margin-top:1rem;color:#6b7280">${esc(label || 'טוען...')}</p>
      <style>@keyframes crmspin{to{transform:rotate(360deg)}}</style>
    </div>`;
  }

  const ui = { btn, iconBtn, kpi, emptyState, errorBox, loadingHTML };

  // ─────────────────────────────────────────────────────
  // 10. MODULE REGISTRY + READINESS GATE
  // ─────────────────────────────────────────────────────
  const _modules = {};
  const _readyCallbacks = [];
  let _ready = false;

  function register(name, module) {
    _modules[name] = module;
    return module;
  }
  function getModule(name) {
    return _modules[name];
  }

  function ready(fn) {
    if (_ready) {
      try { fn(); } catch(e) { console.error('[CRM.ready]', e); }
    } else {
      _readyCallbacks.push(fn);
    }
  }

  function _checkReady() {
    // Wait for State + LS to exist
    if (typeof window.State !== 'undefined' && typeof window.LS !== 'undefined') {
      _ready = true;
      _readyCallbacks.forEach(fn => {
        try { fn(); } catch(e) { console.error('[CRM.ready]', e); }
      });
      _readyCallbacks.length = 0;
      return true;
    }
    return false;
  }

  // Poll until State is ready (or give up after 30 seconds)
  let _readyAttempts = 0;
  const _readyInterval = setInterval(() => {
    if (_checkReady() || ++_readyAttempts > 150) {
      clearInterval(_readyInterval);
      if (!_ready) console.warn('[CRM] State never became available — modules waiting will not run');
    }
  }, 200);
  // Check immediately
  _checkReady();

  // ─────────────────────────────────────────────────────
  // 11. PUBLIC API
  // ─────────────────────────────────────────────────────
  window.CRM = {
    // Formatters
    esc, safeAttr, fmt, fmtDt, fmtMonth, fmtTime, ils, pct, uid, todayISO, nowISO, monthKey,

    // DOM
    $, $$, el,

    // Delegation
    delegate,

    // localStorage
    ls: { get: lsGet, getJSON: lsGetJSON, set: lsSet, setJSON: lsSetJSON, del: lsDel },

    // Memoization
    memo, invalidateMemo,

    // State
    state,

    // Modal
    Modal,

    // UX
    toast, audit, confirmDestructive, withLoading,

    // UI components
    ui,

    // Registry + readiness
    register, get: getModule, ready,

    // Diagnostics
    get _modules() { return { ..._modules }; },
    get _modalStack() { return _modalStack.slice(); }
  };

  console.log('[CRM Core] ✓ Foundation ready — window.CRM available');
})();
