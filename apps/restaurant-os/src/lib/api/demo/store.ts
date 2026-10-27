import { createSeed, DEMO_DATA_VERSION, type DemoData } from './seed';

/**
 * In-memory DEMO state shared by all screens.
 * - Business data is kept in localStorage and shared between tabs of this browser through a
 *   BroadcastChannel ("DEMO sync — not real-time"). Real cross-device sync is Phase 5.
 * - The demo login (chosen role) is per tab (sessionStorage), so a waiter tab and a kitchen tab can
 *   be open side by side.
 * Storage can be blocked (private windows, previews); then the demo simply starts fresh.
 */
const DATA_KEY = 'lala-os-demo-data';
const SESSION_KEY = 'lala-os-demo-session';
const CHANNEL_NAME = 'lala-os-demo-sync';

function readJson<T>(storage: () => Storage, key: string): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown): void {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: the demo keeps working in memory for this tab.
  }
}

function loadData(): DemoData | null {
  const data = readJson<DemoData>(() => window.localStorage, DATA_KEY);
  return data?.version === DEMO_DATA_VERSION ? data : null;
}

interface DemoSessionState {
  userId: string;
}

export class DemoStore {
  private data: DemoData;
  private session: DemoSessionState | null;
  private simulatedFailure = false;
  private readonly listeners = new Set<() => void>();
  private readonly channel: BroadcastChannel | null;

  constructor() {
    this.data = loadData() ?? createSeed();
    this.session = readJson<DemoSessionState>(() => window.sessionStorage, SESSION_KEY);
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
    // The message carries the data itself: another tab's localStorage can still be old when it arrives.
    this.channel?.addEventListener('message', (event: MessageEvent<DemoData>) => {
      if (event.data?.version !== DEMO_DATA_VERSION) return;
      this.data = event.data;
      this.emit();
    });
  }

  read(): DemoData {
    return this.data;
  }

  /**
   * Change business data like one database transaction: the change works on a copy, and the copy is
   * kept only if the change does not throw. Then it is saved and this tab and the other tabs are told.
   */
  update<T>(change: (draft: DemoData) => T): T {
    const draft = structuredClone(this.data);
    const result = change(draft);
    this.data = draft;
    writeJson(() => window.localStorage, DATA_KEY, draft);
    this.channel?.postMessage(draft);
    this.emit();
    return result;
  }

  reset(): void {
    this.data = createSeed();
    try {
      window.localStorage.removeItem(DATA_KEY);
    } catch {
      // ignore blocked storage
    }
    this.channel?.postMessage(this.data);
    this.emit();
  }

  getSessionUserId(): string | null {
    return this.session?.userId ?? null;
  }

  /** null = logged out */
  setSessionUserId(userId: string | null): void {
    this.session = userId ? { userId } : null;
    if (this.session) {
      writeJson(() => window.sessionStorage, SESSION_KEY, this.session);
    } else {
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // storage blocked
      }
    }
    this.emit();
  }

  isSimulatingFailure(): boolean {
    return this.simulatedFailure;
  }

  setSimulatedFailure(on: boolean): void {
    this.simulatedFailure = on;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
