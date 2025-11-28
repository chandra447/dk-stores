// Version is updated on each build - Netlify will serve fresh SW with new deploy
const SW_VERSION = Date.now().toString();
const CACHE_NAME = `dk-store-cache-${SW_VERSION}`;
const STATIC_CACHE_NAME = `dk-store-static-${SW_VERSION}`;
const DYNAMIC_CACHE_NAME = `dk-store-dynamic-${SW_VERSION}`;

// Assets to cache for offline functionality (only truly static assets)
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/logo_transparent.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Install event - cache static assets and force activation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker version:', SW_VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Installation complete, skipping waiting');
        // Force immediate activation - don't wait for old SW to be released
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up ALL old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker version:', SW_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete ALL old caches that don't match current version
            if (!cacheName.includes(SW_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, claiming clients');
        // Take control of all pages immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll({ type: 'window' });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: SW_VERSION
          });
        });
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch event - Network-first strategy for HTML, cache-first for hashed assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external resources
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Skip Convex API calls - they need real-time access
  if (url.pathname.includes('/api/') || url.hostname.includes('convex')) {
    return;
  }

  // For HTML documents (navigation requests) - ALWAYS network first
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // Only use cache/offline when truly offline
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // For hashed assets (/assets/*) - Cache first (they're immutable)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          });
        })
    );
    return;
  }

  // For static assets (images, favicons) - Stale while revalidate
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed, return cached or error
            if (cachedResponse) return cachedResponse;
            return new Response('Resource not available offline', {
              status: 404,
              statusText: 'Not Found'
            });
          });

        // Return cached immediately, update in background
        return cachedResponse || fetchPromise;
      })
  );
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-attendance') {
    console.log('[SW] Background sync triggered for attendance data');
    event.waitUntil(
      // Here you would sync any cached attendance data
      // Implementation depends on your offline data storage strategy
      Promise.resolve()
    );
  }
});

// Push notification handling (if implemented later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);

    const options = {
      body: data.body,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon.ico',
      tag: 'dk-store-attendance',
      data: data.data,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Handle message events from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Allow app to request current version
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
  
  // Force update check
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});