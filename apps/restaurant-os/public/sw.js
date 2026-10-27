// Service worker of Restaurant OS. It only makes the app installable on phones and tablets.
// It caches nothing on purpose: Phase 1 has no offline mode (full offline operation is Phase 11),
// so the app never shows old orders or bills from a cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
