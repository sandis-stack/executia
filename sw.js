// /sw.js
// EXECUTIA Service Worker
// Handles: push notifications, offline cache

const CACHE_NAME = 'executia-v1';
const CACHE_URLS = ['/', '/global.css', '/execution', '/demo', '/status'];

// ── INSTALL — cache core assets ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE — clean old caches ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── FETCH — serve from cache, fall back to network ──
self.addEventListener('fetch', function(e) {
  // Never cache API calls
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache HTML pages
        if (e.request.destination === 'document') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(e.request, clone); });
        }
        return response;
      });
    }).catch(function() {
      // Offline fallback — show demo page
      if (e.request.destination === 'document') {
        return caches.match('/demo') || caches.match('/');
      }
    })
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'EXECUTIA', body: e.data.text() }; }

  var title   = data.title   || 'EXECUTIA ALERT';
  var options = {
    body:    data.body    || 'System notification',
    icon:    '/icon-192.png',
    badge:   '/icon-72.png',
    tag:     data.tag     || 'executia-alert',
    data:    data.url     ? { url: data.url } : {},
    actions: data.executionId ? [
      { action: 'view',    title: 'VIEW RECORD' },
      { action: 'dismiss', title: 'DISMISS' }
    ] : []
  };

  e.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', function(e) {
  e.notification.close();

  if (e.action === 'view' && e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  } else if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow('/'));
  }
});
