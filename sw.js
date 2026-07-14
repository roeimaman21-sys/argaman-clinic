// Service Worker — קליניקת ארגמן PWA
// Cache strategies: stale-while-revalidate for static assets, network-first for HTML
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = 'argaman-static-' + CACHE_VERSION;
const RUNTIME_CACHE = 'argaman-runtime-' + CACHE_VERSION;

// Critical resources to pre-cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/about.html',
  '/services.html',
  '/contact.html',
  '/faq.html',
  '/blog.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(()=>{}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('argaman-') && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Skip non-GET, admin, and chrome-extension
  if (request.method !== 'GET') return;
  if (request.url.includes('/admin.html')) return;
  if (request.url.startsWith('chrome-extension://')) return;
  if (request.url.includes('supabase.co')) return; // never cache supabase

  const url = new URL(request.url);

  // For HTML: network-first with cache fallback
  if (request.destination === 'document' || url.pathname.endsWith('.html')){
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy)).catch(()=>{});
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

  // For static assets: stale-while-revalidate
  if (['style','script','image','font'].includes(request.destination)){
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response && response.status === 200){
            const copy = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, copy)).catch(()=>{});
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// Listen for skip-waiting message from page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
