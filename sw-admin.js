/* =====================================================
   sw-admin.js — Service Worker for CRM (admin.html only)
   Provides install prompt, basic offline shell, and push notifications.
   ===================================================== */
const CACHE = 'argaman-crm-v2';
const SHELL = [
  '/admin.html',
  '/admin.webmanifest',
  '/supabase-lib.js',
  '/crypto-utils.js',
  '/cloud-realtime.js',
  '/role-guard.js',
  '/audit-log.js',
  '/presence.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only handle same-origin GETs
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // Don't cache Supabase API
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetcher = fetch(event.request)
        .then(resp => {
          if (resp && resp.status === 200 && resp.type === 'basic'){
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone)).catch(()=>{});
          }
          return resp;
        })
        .catch(() => cached || caches.match('/admin.html'));
      return cached || fetcher;
    })
  );
});

// Push notifications (Web Push) — receives push from server
self.addEventListener('push', (event) => {
  let data = { title: 'קליניקת ארגמן', body: 'יש עדכון חדש' };
  try { if (event.data) data = event.data.json(); } catch(_){}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'argaman',
      data: data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/admin.html'));
});
