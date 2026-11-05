import { ApiError } from '../client';
import { createSeed, DEMO_DATA_VERSION, DEMO_FIXTURE_KEY, upgradeDemoData, type DemoData, type DemoFixture } from './seed';

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
const ASK_FOR_DATA = 'ask-for-data';

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

/** The owner's Lala Restaurant, or the Aziz Pizza test data when a walkthrough asked for it. */
function fixture(): DemoFixture {
  try {
    return window.localStorage.getItem(DEMO_FIXTURE_KEY) === 'acceptance' ? 'acceptance' : 'restaurant';
  } catch {
    return 'restaurant';
  }
}

function freshSeed(): DemoData {
  return createSeed(fixture());
}

/** The saved demo data, brought up to date when it is one version old (never thrown away for that). */
function loadData(): DemoData | null {
  const saved = readJson<unknown>(() => window.localStorage, DATA_KEY);
  const data = upgradeDemoData(saved, fixture());
  if (data && (saved as { version?: number }).version !== DEMO_DATA_VERSION) writeJson(() => window.localStorage, DATA_KEY, data);
  return data;
}

interface DemoSessionState {
  userId: string;
  /** The account's session version at login (DEMO stand-in for the server's token_version); missing = 0 */
  version?: number;
}

export class DemoStore {
  private data: DemoData;
  private session: DemoSessionState | null;
  private simulatedFailure = false;
  private readonly listeners = new Set<() => void>();
  private readonly channel: BroadcastChannel | null;
  private readonly isLinkPage: boolean;
  private ready: boolean;

  constructor() {
    // The hidden link page of the website and Rider App may get its own browser storage, so it never uses storage: it starts
    // with nothing to say, asks an open Restaurant OS tab for the data, and only then answers or changes anything.
    this.isLinkPage = window.self !== window.top && window.location.pathname === '/demo-link';
    this.data = (this.isLinkPage ? null : loadData()) ?? freshSeed();
    this.ready = !this.isLinkPage;
    this.session = readJson<DemoSessionState>(() => window.sessionStorage, SESSION_KEY);
    this.channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
    // The message carries the data itself: another tab's localStorage can still be old when it arrives.
    this.channel?.addEventListener('message', (event: MessageEvent<DemoData | typeof ASK_FOR_DATA | { forLinkPage: DemoData }>) => {
      if (event.data === ASK_FOR_DATA) {
        if (this.ready) this.channel?.postMessage({ forLinkPage: this.data });
        return;
      }
      if ('forLinkPage' in event.data) {
        // Only a link page that has nothing yet takes this answer: a tab keeps its newer data.
        if (!this.isLinkPage || this.ready || event.data.forLinkPage.version !== DEMO_DATA_VERSION) return;
        this.data = event.data.forLinkPage;
        this.ready = true;
        this.emit();
        return;
      }
      if (event.data?.version !== DEMO_DATA_VERSION) return;
      this.data = event.data;
      this.ready = true;
      // A change made through the link page is saved by the tabs: that page does not use storage.
      if (!this.isLinkPage) writeJson(() => window.localStorage, DATA_KEY, this.data);
      this.emit();
    });
    if (this.isLinkPage) this.channel?.postMessage(ASK_FOR_DATA);
  }

  read(): DemoData {
    return this.data;
  }

  /** False only on the hidden link page while no Restaurant OS tab has answered. */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Change business data like one database transaction: the change works on a copy, and the copy is
   * kept only if the change does not throw. Then it is saved and this tab and the other tabs are told.
   */
  update<T>(change: (draft: DemoData) => T): T {
    if (!this.ready) throw new ApiError('CONFLICT', 'Restaurant OS is not open. Open it on this computer and try again.');
    const draft = structuredClone(this.data);
    const result = change(draft);
    this.data = draft;
    if (!this.isLinkPage) writeJson(() => window.localStorage, DATA_KEY, draft);
    this.channel?.postMessage(draft);
    this.emit();
    return result;
  }

  reset(): void {
    this.data = freshSeed();
    try {
      window.localStorage.removeItem(DATA_KEY);
    } catch {
      // ignore blocked storage
    }
    this.channel?.postMessage(this.data);
    this.emit();
  }

  getSession(): { userId: string; version: number } | null {
    return this.session ? { userId: this.session.userId, version: this.session.version ?? 0 } : null;
  }

  /** null = logged out */
  setSession(userId: string | null, version = 0): void {
    this.session = userId ? { userId, version } : null;
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
