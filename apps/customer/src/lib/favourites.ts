'use client';

import { useSyncExternalStore } from 'react';
import { deviceStore } from './device-store';

const NONE: string[] = [];
const device = deviceStore<string[]>('lala-store-favourites', NONE);

/** Favourite dishes, per restaurant, on this device only (real customer accounts come with the backend). */
export function useFavourites(restaurantSlug: string) {
  const ids = useSyncExternalStore(device.subscribe, () => device.load(restaurantSlug), () => NONE);
  return {
    ids,
    has: (itemId: string) => ids.includes(itemId),
    toggle: (itemId: string) => device.save(restaurantSlug, ids.includes(itemId) ? ids.filter((id) => id !== itemId) : [...ids, itemId]),
  };
}

export type Favourites = ReturnType<typeof useFavourites>;
