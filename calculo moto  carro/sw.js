/**
 * Service Worker - Controle da Moto
 * Gerencia cache offline e atualizações
 */

const CACHE_NAME = 'moto-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/js/storage.js',
  '/js/fuel.js',
  '/js/oil.js',
  '/js/dashboard.js',
  '/js/charts.js',
  '/js/export.js',
  '/js/auth.js',
  '/js/drive.js',
  '/js/notifications.js',
  '/js/app.js'
];

// CDN assets to cache
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache static assets
        return cache.addAll(STATIC_ASSETS)
          .catch(err => console.warn('Static assets cache failed:', err));
      })
      .then(() => {
        // Cache CDN assets (fire and forget)
        caches.open(CACHE_NAME + '-cdn')
          .then(cache => {
            CDN_ASSETS.forEach(url => {
              fetch(url)
                .then(response => {
                  if (response.ok) {
                    cache.put(url, response);
                  }
                })
                .catch(() => {});
            });
          })
          .catch(() => {});
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('moto-cache-') && name !== CACHE_NAME && !name.includes('-cdn');
          })
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Claim clients for immediate control
      return self.clients.claim();
    })
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-HTTP(S) requests
  if (!event.request.url.startsWith('http')) return;

  // Handle CDN assets with cache-first strategy
  if (event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('cdn.jsdelivr.net') ||
      event.request.url.includes('cdn.sheetjs.com')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const clonedResponse = response.clone();
                caches.open(CACHE_NAME + '-cdn')
                  .then(cache => cache.put(event.request, clonedResponse));
              }
              return response;
            })
            .catch(() => {
              return cachedResponse || new Response('Offline', { status: 503 });
            });
        })
    );
    return;
  }

  // For app assets, use network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with new response
        if (response.ok && response.type === 'basic') {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clonedResponse));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // If HTML request and not in cache, return index.html for SPA
            if (event.request.headers.get('Accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
