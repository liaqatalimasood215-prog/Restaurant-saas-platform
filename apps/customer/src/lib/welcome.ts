'use client';

import { useState, useSyncExternalStore } from 'react';
import { deviceStore } from './device-store';

const welcomed = deviceStore<boolean>('lala-store-welcomed', false);

/** The first visit on this device opens on Login, once, with Skip (owner's design, screen 1); never inside a preview frame. */
export function useFirstVisit(restaurantSlug: string): boolean {
  const seen = useSyncExternalStore(welcomed.subscribe, () => welcomed.load(restaurantSlug), () => true);
  const [inFrame] = useState(() => typeof window !== 'undefined' && window.self !== window.top);
  return !seen && !inFrame;
}

export function markWelcomed(restaurantSlug: string): void {
  welcomed.save(restaurantSlug, true);
}
