/**
 * PANGEA CARBON — Service Worker
 * PWA offline support · Cache stratégie
 */
const CACHE_NAME = 'pangea-carbon-v1';
const STATIC_ASSETS = ['/', '/auth/login', '/dashboard'];

// Install: mise en cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network first, cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: toujours réseau (pas de cache pour les données live)
  if (url.pathname.startsWith('/api/')) return;

  // Assets statiques: cache first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background sync: synchroniser les lectures offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-readings') {
    event.waitUntil(syncOfflineReadings());
  }
});

async function syncOfflineReadings() {
  // Récupérer les lectures en attente depuis IndexedDB
  console.log('[SW] Synchronisation des lectures offline...');
}
