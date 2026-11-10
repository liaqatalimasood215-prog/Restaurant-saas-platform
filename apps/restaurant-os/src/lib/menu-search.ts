'use client';

import { useSyncExternalStore } from 'react';

/**
 * The menu search text, shared by the header search and the POS product list (owner, 2026-11-10): typed in the header, the POS
 * shows only the matching products. Kept in memory for this tab while the app is open; nothing is saved.
 */
let text = '';
const listeners = new Set<() => void>();

export function setMenuSearch(next: string): void {
  if (next === text) return;
  text = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMenuSearch(): string {
  return useSyncExternalStore(subscribe, () => text, () => '');
}
