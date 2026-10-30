/**
 * Small state kept on this device (localStorage) and shared with the other tabs of this browser: the cart,
 * favourites and "do not ask again". Never security, and it can be empty at any time.
 */
export function deviceStore<T>(prefix: string, empty: T) {
  const snapshots = new Map<string, T>();
  const listeners = new Set<() => void>();
  const storageKey = (key: string) => `${prefix}:${key}`;
  let listening = false;

  return {
    load(key: string): T {
      const cached = snapshots.get(key);
      if (cached !== undefined) return cached;
      let value = empty;
      try {
        const raw = window.localStorage.getItem(storageKey(key));
        if (raw) value = JSON.parse(raw) as T;
      } catch {
        // Storage blocked or broken: start empty.
      }
      snapshots.set(key, value);
      return value;
    },

    save(key: string, value: T): void {
      snapshots.set(key, value);
      try {
        window.localStorage.setItem(storageKey(key), JSON.stringify(value));
      } catch {
        // Storage blocked: it still works in this tab.
      }
      for (const listener of listeners) listener();
    },

    subscribe(listener: () => void): () => void {
      if (!listening) {
        listening = true;
        // Another tab changed it.
        window.addEventListener('storage', (event) => {
          if (!event.key?.startsWith(`${prefix}:`)) return;
          snapshots.clear();
          for (const l of listeners) l();
        });
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
