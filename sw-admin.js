/* =====================================================
   sw-admin.js — Service Worker for CRM (admin.html only)
   Network-first for JS/CSS (so updates propagate immediately).
   Cache-first only for fonts/images.
   ===================================================== */
const CACHE = 'argaman-crm-v4';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
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
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // Never intercept Supabase API
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') ||
      url.pathname.includes('/realtime/') || url.pathname.includes('/storage/')) return;

  const isAsset = /\.(js|css|html|webmanifest|json)$/.test(url.pathname);
  const isMedia = /\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|ico)$/.test(url.pathname);

  if (isAsset){
    // Network-first for code (so deployed fixes propagate)
    event.respondWith(
      fetch(event.request).then(resp => {
        if (resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone)).catch(()=>{});
        }
        return resp;
      }).catch(() => caches.match(event.request).then(c => c || caches.match('/admin.html')))
    );
  } else if (isMedia){
    // Cache-first for media (rarely changes)
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
        if (resp && resp.status === 200){
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone)).catch(()=>{});
        }
        return resp;
      }))
    );
  }
  // else: let browser handle normally
});

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
