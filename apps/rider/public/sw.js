// Service worker of the Rider App. It only makes the app installable on phones.
// It caches nothing on purpose: there is no offline mode (full offline operation is Phase 11),
// so a rider never sees an old delivery from a cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
