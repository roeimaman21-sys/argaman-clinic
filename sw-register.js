/* =====================================================
   sw-register.js — Registers sw.js for offline support (A15.7)
   Skipped on admin.html (CRM has its own caching concerns
   and sw.js already excludes it from fetch interception).
   ===================================================== */
(function(){
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  if (location.pathname.includes('admin.html')) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail — offline support is a progressive enhancement, not required
    });
  });
})();
