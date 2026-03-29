// ── Daily Grind Service Worker ────────────────────────────────────────────────
const CACHE_NAME = 'dg-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon.svg'
];

// ── Install: pre-cache all assets ─────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first, fall back to network ──────────────────────────────────
self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── Push: handle server-sent push (future-ready) ──────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'Daily Grind ⚡', body: "Time to log your day!" };
  try { if (e.data) data = e.data.json(); } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon.svg',
      badge: './icon.svg',
      tag: 'dg-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: './' }
    })
  );
});

// ── Local scheduled notification (triggered by the page via postMessage) ───────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title || 'Daily Grind ⚡', {
      body: e.data.body || "Time to log your day!",
      icon: './icon.svg',
      badge: './icon.svg',
      tag: 'dg-reminder',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: './' }
    });
  }
});

// ── Notification click: open / focus the app ──────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('daily-grind') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
