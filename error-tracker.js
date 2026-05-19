/* =====================================================
   error-tracker.js — Lightweight runtime error capture
   Stores errors in Supabase argaman_error_log
   ===================================================== */
(function(){
  'use strict';

  const MAX_LOCAL_QUEUE = 50;
  const _queue = [];
  let _userId = null;
  let _userEmail = null;
  let _isLoadingUser = false;

  async function loadUser(){
    if (_isLoadingUser) return;
    _isLoadingUser = true;
    try {
      if (window.supa?.auth){
        const { data } = await window.supa.auth.getUser();
        if (data?.user){
          _userId = data.user.id;
          _userEmail = data.user.email;
        }
      }
    } catch(_){}
    _isLoadingUser = false;
  }

  async function flush(){
    if (_queue.length === 0 || !window.supa) return;
    const batch = _queue.splice(0, _queue.length);
    try {
      await window.supa.from('argaman_error_log').insert(batch);
    } catch (e){
      // Re-queue if Supabase fails (but cap)
      console.warn('[ErrorTracker] flush failed:', e.message);
      _queue.unshift(...batch.slice(0, MAX_LOCAL_QUEUE));
    }
  }

  /** Sanitize text to remove PII before sending to server */
  function sanitize(text){
    if (!text) return text;
    return String(text)
      .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '<email>')
      .replace(/\b05\d-?\d{7}\b/g, '<phone>')
      .replace(/\b(?:\+972|972|0)5\d-?\d{7}\b/g, '<phone>')
      .replace(/\b[a-f0-9]{32,}\b/gi, '<token>')
      .replace(/(client[_-]?id|user[_-]?id|email|phone)\s*[:=]\s*["']?[\w@.+-]+/gi, '$1=<redacted>')
      .replace(/Bearer\s+[\w.-]+/gi, 'Bearer <redacted>')
      .replace(/sb-\w+-auth-token/g, '<auth-token>');
  }

  function reportError(opts){
    const entry = {
      user_id: _userId,
      user_email: _userEmail,
      message: sanitize(String(opts.message || '').slice(0, 1000)),
      stack: opts.stack ? sanitize(String(opts.stack).slice(0, 5000)) : null,
      url: location.href.replace(/[?#].*$/, '').slice(0, 500), // strip query string
      user_agent: navigator.userAgent.slice(0, 300),
      source: opts.source || 'manual',
      metadata: opts.metadata ? JSON.parse(sanitize(JSON.stringify(opts.metadata))) : null
    };
    _queue.push(entry);
    if (_queue.length > MAX_LOCAL_QUEUE){
      _queue.splice(0, _queue.length - MAX_LOCAL_QUEUE);
    }
    // Debounce flush
    if (_flushTimer) clearTimeout(_flushTimer);
    _flushTimer = setTimeout(flush, 2000);
  }
  let _flushTimer = null;

  // Global error capture
  window.addEventListener('error', (e) => {
    if (!e || !e.message) return;
    reportError({
      message: e.message,
      stack: e.error?.stack,
      source: 'error',
      metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno }
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message = reason?.message || String(reason || 'Unhandled promise rejection');
    reportError({
      message,
      stack: reason?.stack,
      source: 'unhandledrejection'
    });
  });

  // Flush on page hide / unload
  window.addEventListener('pagehide', () => {
    if (_queue.length > 0 && window.supa){
      // Use fetch with keepalive for unload reliability
      try {
        const url = `${window.SUPA_URL}/rest/v1/argaman_error_log`;
        navigator.sendBeacon?.(url, JSON.stringify(_queue));
      } catch(_){}
    }
  });

  // Initial user load + start flushing periodically
  loadUser().then(() => setInterval(flush, 30000));

  // Public API
  window.ErrorTracker = {
    report: reportError,
    flush,
    queueSize: () => _queue.length,
    setUser: (id, email) => { _userId = id; _userEmail = email; }
  };

  console.log('[ErrorTracker] ✓ ready');
})();
