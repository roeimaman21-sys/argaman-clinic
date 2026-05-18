/* =====================================================
   sw-admin.js — DISABLED (kill switch)
   This SW immediately unregisters itself and clears all caches.
   Reason: previous versions caused stale-content issues.
   ===================================================== */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Delete ALL caches
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    // Unregister this SW so the next page load is fully network-based
    await self.registration.unregister();
    // Tell any active clients to reload
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
// Pass-through fetch — no interception at all
self.addEventListener('fetch', () => {});
