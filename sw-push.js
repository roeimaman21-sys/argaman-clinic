/* sw-push.js — Service Worker dedicated to Push Notifications only.
   No fetch caching. Lives at /sw-push.js with scope / so push works anywhere. */

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', event => {
  let data = { title: 'קליניקת ארגמן', body: 'יש עדכון חדש' };
  try { if (event.data) data = event.data.json(); } catch(_){
    try { data.body = event.data && event.data.text() || data.body; } catch(_){}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'קליניקת ארגמן', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'argaman',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: data
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Reuse existing window if open
      for (const c of clientList){
        if (c.url.includes('/admin.html') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
