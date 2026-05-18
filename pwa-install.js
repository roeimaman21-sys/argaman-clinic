/* =====================================================
   pwa-install.js — CRM install prompt + notifications
   ===================================================== */
(function(){
  'use strict';
  let _deferredPrompt = null;
  let _swReady = false;

  function log(...a){ console.log('[PWA]', ...a); }

  // KILL switch — proactively unregister any existing SW + clear caches
  async function killOldSW(){
    if (!('serviceWorker' in navigator)) return;
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs){ await reg.unregister(); log('Unregistered SW:', reg.scope); }
      if ('caches' in window){
        const keys = await caches.keys();
        for (const k of keys){ await caches.delete(k); log('Deleted cache:', k); }
      }
    } catch(e){ log('killOldSW error:', e.message); }
  }
  function registerSW(){
    // SW disabled — instead, kill any existing one to prevent stale content
    killOldSW();
  }

  // Catch install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    if (!location.pathname.endsWith('/admin.html')) return;
    e.preventDefault();
    _deferredPrompt = e;
    showInstallButton();
  });

  // After install
  window.addEventListener('appinstalled', () => {
    log('App installed');
    _deferredPrompt = null;
    hideInstallButton();
    if (typeof window.toast === 'function') window.toast('✅ ה-CRM הותקן! עכשיו תוכל לפתוח אותו כאפליקציה.', 'success');
  });

  function showInstallButton(){
    if (document.getElementById('pwa-install-btn')) return;
    const topbar = document.querySelector('.topbar-actions');
    if (!topbar) return;
    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.className = 'topbar-btn';
    btn.style.cssText = 'background:#1B3A6B;color:#fff;padding:.4rem .8rem;border-radius:50px;font-size:.75rem;font-weight:700;border:none;cursor:pointer';
    btn.textContent = '📲 התקן אפליקציה';
    btn.onclick = doInstall;
    topbar.insertBefore(btn, topbar.firstChild);
  }

  function hideInstallButton(){
    document.getElementById('pwa-install-btn')?.remove();
  }

  async function doInstall(){
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    log('Install outcome:', outcome);
    _deferredPrompt = null;
    hideInstallButton();
  }

  // Notifications API — ask permission, show notifications on realtime events
  async function requestNotificationPermission(){
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch(_) { return false; }
  }

  function showLocalNotification(title, body, tag){
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.hasFocus()) return; // don't notify if user is looking at the page
    try {
      new Notification(title, {
        body,
        icon: '/icons/icon-192.png',
        tag: tag || 'argaman',
        badge: '/icons/icon-192.png'
      });
    } catch(e){ log('Notification failed:', e.message); }
  }

  // Expose
  window.PWA = {
    requestNotificationPermission,
    showLocalNotification,
    install: doInstall,
    isInstallable: () => !!_deferredPrompt
  };

  // Auto-init
  document.addEventListener('DOMContentLoaded', registerSW);

  log('✓ ready');
})();
