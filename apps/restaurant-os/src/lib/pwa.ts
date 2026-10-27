'use client';

import { useEffect, useState } from 'react';

/**
 * "Install App" (PWA). Android Chrome/Edge offer an install prompt we can trigger from a button;
 * iPhone Safari has no prompt, so we show the "Add to Home Screen" hint instead.
 * Installing needs HTTPS (or localhost). No offline data: full offline operation is Phase 11.
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

export interface InstallState {
  canPrompt: boolean;
  isIos: boolean;
  isInstalled: boolean;
  install: () => Promise<void>;
}

/** Screens that use this render only in the browser (after the login check), so window is available. */
function readEnvironment() {
  if (typeof window === 'undefined') return { isIos: false, isInstalled: false };
  return {
    isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
    isInstalled: window.matchMedia('(display-mode: standalone)').matches,
  };
}

export function useInstallApp(): InstallState {
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
    isInstalled: env.isInstalled,
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      notify();
    },
  };
}

/** Registers the service worker that makes the app installable. It caches nothing (no offline mode). */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
}
