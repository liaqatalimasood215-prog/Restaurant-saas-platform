// Service worker of the customer website. It only makes the website installable on phones.
// It caches nothing on purpose: there is no offline mode (full offline operation is Phase 11),
// so a customer never sees an old menu or old prices from a cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
