'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Install prompt and offline message. Android Chrome/Edge offer an install prompt we can trigger from a button;
 * iPhone Safari has no prompt, so we show the "Add to Home Screen" hint instead. Installing needs HTTPS (or localhost).
 * No offline data: the website needs internet, and full offline operation is Phase 11.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Screens that use this render only in the browser (after the store has loaded), so window is available. */
function readEnvironment() {
  if (typeof window === 'undefined') return { isIos: false, isInstalled: false, inFrame: false };
  return {
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    isInstalled: window.matchMedia('(display-mode: standalone)').matches,
    // The preview inside Restaurant OS shows the website in a frame: no install offer there.
    inFrame: window.self !== window.top,
  };
}

export function useInstallApp() {
  const [, setTick] = useState(0);
  const [env] = useState(readEnvironment);

  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    canPrompt: deferred !== null,
    isIos: env.isIos,
    canOffer: !env.isInstalled && !env.inFrame && (deferred !== null || env.isIos),
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      notify();
    },
  };
}

/** Registers the service worker that makes the website installable. It caches nothing. */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}

function subscribeOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
