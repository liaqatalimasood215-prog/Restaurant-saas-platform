// DEMO
import {
  RIDER_BUSY_MESSAGE,
  RIDER_LINK_ASK,
  RIDER_LINK_COMMAND,
  RIDER_LINK_DATA,
  RIDER_LINK_RESULT,
  canRiderGoOffline,
  deliveryAreaLabel,
  normalizePhone,
  riderDayTotals,
  checkTransition,
  isRiderLinkData,
  rupeesToPaisa,
  type RiderAccount,
  type RiderDelivery,
  type RiderLinkCommand,
  type RiderLinkData,
} from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { dateKey, daysAgoKey } from '../../dates';
import { newId } from '../../new-id';
import { ApiError, type DemoControls, type DemoSource, type RiderApi, type RiderBranch, type RiderDaySummary, type RiderPastDelivery } from '../client';
import { DEMO_BRANCHES, DEMO_EARNINGS, DEMO_NEW_ORDERS, DEMO_PAST_DELIVERIES, DEMO_PIN } from './seed';

/**
 * Phase 3 implementation of the RiderApi. A direct visit (also on a phone) uses sample data kept in this browser.
 * Inside the Riders page of Restaurant OS, or a tab opened from it, the app uses that page's real demo orders through
 * a DEMO link, and the rider's steps go back to it. It is NOT a security boundary: the server decides from Phase 4.
 */
const KEY = 'lala-rider-demo-v2';
const SESSION_KEY = 'lala-rider-session-v1';
/** The DEMO Pick Up taps: rider and order ids, never customer details. */
const PICKUPS_KEY = 'lala-rider-pickups-v1';
const RESTAURANT_OS_ORIGIN = 'http://localhost:3000';
const ASK_EVERY_MS = 1000;
const FIRST_ANSWER_MS = 800;
const LOST_AFTER_MS = 4000;
const GIVE_UP_AFTER_ASKS = 5;

interface SampleBranch {
  riders: RiderAccount[];
  deliveries: RiderDelivery[];
  nextNumber: number;
  newOrders: number;
}
type SampleState = Record<string, SampleBranch>;
interface DemoSession {
  scope: string;
  riderId: string;
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
const scopeOf = (restaurant: string, branch: string) => `${restaurant}/${branch}`;
const nowIso = () => new Date().toISOString();
/** With the rider's id: a tap never follows the order to another rider. */
const pickupKey = (delivery: Pick<RiderDelivery, 'id' | 'riderId'>) => `${delivery.riderId}:${delivery.id}`;

function startSample(): SampleState {
  const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
  return Object.fromEntries(
    DEMO_BRANCHES.map((seed) => {
      const deliveries = seed.deliveries.map((d, i): RiderDelivery => ({
        ...d,
        id: `${seed.restaurantSlug}-${i + 1}`,
        dailyNumber: (seed.firstNumber ?? 11) + i,
        assignedAt: minutesAgo(90 - i * 15),
        pickedUpAt: d.status === 'RIDER_ASSIGNED' ? null : minutesAgo(80 - i * 15),
        deliveredAt: d.status === 'DELIVERED' ? minutesAgo(60 - i * 15) : null,
      }));
      return [scopeOf(seed.restaurantSlug, seed.branchSlug), { riders: structuredClone(seed.riders), deliveries, nextNumber: (seed.firstNumber ?? 11) + deliveries.length, newOrders: 0 }];
    }),
  );
}

export class DemoAdapter implements RiderApi, DemoControls {
  private sample: SampleState | null = null;
  private listening = false;
  private readonly listeners = new Set<() => void>();
  private readonly host: Window | null;
  /** The opener or the frame's parent keeps the login per tab, so two riders can sit side by side. */
  private readonly sessionStore: () => Storage;
  private session: DemoSession | null = null;
  private sessionLoaded = false;
  private link: RiderLinkData | null = null;
  private linkSeenAt = 0;
  private linkLost = false;
  private linkStarted = false;
  private firstAnswer: Promise<void> = Promise.resolve();
  private readonly pending = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();

  constructor() {
    this.host = window.parent !== window ? window.parent : ((window.opener as Window | null) ?? null);
    this.sessionStore = () => (this.host ? window.sessionStorage : window.localStorage);
  }

  // ── DEMO link to Restaurant OS ───────────────────────────────────────────────────────────

  private startLink(): void {
    if (this.linkStarted || !this.host) return;
    this.linkStarted = true;
    let asks = 0;
    const ask = () => {
      asks += 1;
      if (!this.link && asks > GIVE_UP_AFTER_ASKS) return window.clearInterval(timer);
      if (this.link && !this.linkLost && Date.now() - this.linkSeenAt > LOST_AFTER_MS) {
        this.linkLost = true;
        this.emit();
      }
      try {
        this.host?.postMessage({ type: RIDER_LINK_ASK, riderId: this.currentSession()?.riderId ?? null }, RESTAURANT_OS_ORIGIN);
      } catch {
        // The other page was closed: the "lost" message above tells the rider.
      }
    };
    const timer = window.setInterval(ask, ASK_EVERY_MS);
    this.firstAnswer = new Promise<void>((resolve) => {
      setTimeout(resolve, FIRST_ANSWER_MS);
      window.addEventListener('message', (event) => {
        if (event.origin !== RESTAURANT_OS_ORIGIN) return;
        if (event.data?.type === RIDER_LINK_DATA && isRiderLinkData(event.data.data)) {
          const changed = JSON.stringify(event.data.data) !== JSON.stringify(this.link) || this.linkLost;
          this.link = event.data.data;
          this.linkSeenAt = Date.now();
          this.linkLost = false;
          resolve();
          if (changed) this.emit();
        } else if (event.data?.type === RIDER_LINK_RESULT) {
          const waiting = this.pending.get(event.data.id);
          this.pending.delete(event.data.id);
          if (event.data.error) waiting?.reject(new ApiError('CONFLICT', String(event.data.error)));
          else waiting?.resolve();
        }
      });
    });
    ask();
  }

  private command(command: RiderLinkCommand): Promise<void> {
    if (this.linkLost) return Promise.reject(new ApiError('CONFLICT', t('demo.linkLost')));
    const id = newId();
    return new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.host?.postMessage({ type: RIDER_LINK_COMMAND, id, command }, RESTAURANT_OS_ORIGIN);
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new ApiError('CONFLICT', t('demo.linkLost')));
      }, LOST_AFTER_MS);
    }).then(() => this.askNow());
  }

  /** After a step the next answer comes at once, not at the next tick. */
  private askNow(): Promise<void> {
    const before = this.linkSeenAt;
    this.host?.postMessage({ type: RIDER_LINK_ASK, riderId: this.currentSession()?.riderId ?? null }, RESTAURANT_OS_ORIGIN);
    return new Promise<void>((resolve) => {
      const started = Date.now();
      const check = () => (this.linkSeenAt !== before || Date.now() - started > 500 ? resolve() : setTimeout(check, 20));
      check();
    });
  }

  private linkFor(scope: string): RiderLinkData | null {
    return this.link && scopeOf(this.link.restaurantSlug, this.link.branchSlug) === scope ? this.link : null;
  }

  // ── Sample data ──────────────────────────────────────────────────────────────────────────

  private samples(): SampleState {
    if (!this.sample) {
      try {
        const raw = window.localStorage.getItem(KEY);
        this.sample = raw ? (JSON.parse(raw) as SampleState) : startSample();
      } catch {
        this.sample = startSample();
      }
    }
    if (!this.listening) {
      this.listening = true;
      window.addEventListener('storage', (event) => {
        if (event.key !== KEY) return;
        this.sample = null;
        this.emit();
      });
    }
    return this.sample;
  }

  private saveSample(): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.sample));
    } catch {
      // Storage blocked or full: the demo keeps working in memory for this tab.
    }
    this.emit();
  }

  private currentSample(): SampleBranch {
    const session = this.currentSession();
    const branch = session && this.samples()[session.scope];
    if (!branch) throw new ApiError('FORBIDDEN', t('login.again'));
    return branch;
  }

  // ── Session ──────────────────────────────────────────────────────────────────────────────

  private currentSession(): DemoSession | null {
    if (!this.sessionLoaded) {
      this.sessionLoaded = true;
      try {
        const raw = this.sessionStore().getItem(SESSION_KEY);
        this.session = raw ? (JSON.parse(raw) as DemoSession) : null;
      } catch {
        this.session = null;
      }
      // The Riders page shows the app as the rider chosen there.
      const wanted = this.host ? new URLSearchParams(window.location.search).get('rider') : null;
      const [restaurant, branch] = window.location.pathname.split('/').filter(Boolean);
      if (wanted && restaurant && branch) this.saveSession({ scope: scopeOf(restaurant, branch), riderId: wanted });
    }
    return this.session;
  }

  private saveSession(session: DemoSession | null): void {
    this.session = session;
    try {
      if (session) this.sessionStore().setItem(SESSION_KEY, JSON.stringify(session));
      else this.sessionStore().removeItem(SESSION_KEY);
    } catch {
      // Storage blocked: the login lasts until a reload.
    }
    this.emit();
  }

  private accounts(scope: string): RiderAccount[] {
    return this.linkFor(scope)?.riders ?? this.samples()[scope]?.riders ?? [];
  }

  private async ready(): Promise<void> {
    this.startLink();
    await this.firstAnswer;
    await wait();
  }

  // ── RiderApi ─────────────────────────────────────────────────────────────────────────────

  async getBranch(restaurant: string, branch: string): Promise<RiderBranch> {
    await this.ready();
    const scope = scopeOf(restaurant, branch);
    const seed = DEMO_BRANCHES.find((b) => scopeOf(b.restaurantSlug, b.branchSlug) === scope);
    if (!seed) throw new ApiError('NOT_FOUND', t('app.notFoundBody'));
    const link = this.linkFor(scope);
    return link ? { ...seed.branch, restaurantName: link.restaurantName, branchName: link.branchName } : seed.branch;
  }

  async listAccounts(restaurant: string, branch: string): Promise<RiderAccount[]> {
    await this.ready();
    return this.accounts(scopeOf(restaurant, branch));
  }

  demoPin(): string {
    return DEMO_PIN;
  }

  /** DEMO: finds the rider by phone; any PIN is accepted. The server checks the real PIN or password. */
  async login(restaurant: string, branch: string, phone: string, pin: string): Promise<void> {
    await this.ready();
    const scope = scopeOf(restaurant, branch);
    const account = this.accounts(scope).find((a) => (normalizePhone(a.phone) ?? a.phone) === phone);
    if (!account || !pin) throw new ApiError('NOT_FOUND', t('login.unknown'));
    if (!account.isActive) throw new ApiError('FORBIDDEN', t('login.disabled'));
    if (!account.activatedAt) throw new ApiError('FORBIDDEN', t('login.notActivated'));
    if (this.linkFor(scope)) await this.command({ kind: 'LOGIN', riderId: account.id });
    this.saveSession({ scope, riderId: account.id });
  }

  async logout(): Promise<void> {
    this.saveSession(null);
  }

  async getMe(restaurant: string, branch: string): Promise<RiderAccount | null> {
    await this.ready();
    const scope = scopeOf(restaurant, branch);
    const session = this.currentSession();
    if (session?.scope !== scope) return null;
    const account = this.accounts(scope).find((a) => a.id === session.riderId);
    // A disabled rider is logged out at once (PROJECT_RULES.md §7). DEMO only: the real check is on the server.
    if (!account?.isActive || !account.activatedAt) {
      this.saveSession(null);
      return null;
    }
    return account;
  }

  async setOnline(online: boolean): Promise<void> {
    await this.ready();
    const session = this.currentSession();
    if (!session) throw new ApiError('FORBIDDEN', t('login.again'));
    if (this.linkFor(session.scope)) return this.command({ kind: 'SET_ONLINE', riderId: session.riderId, online });
    const branch = this.currentSample();
    const running = branch.deliveries.filter((d) => d.riderId === session.riderId && d.status !== 'DELIVERED').length;
    if (!online && !canRiderGoOffline(running)) throw new ApiError('CONFLICT', RIDER_BUSY_MESSAGE);
    const account = branch.riders.find((a) => a.id === session.riderId);
    if (account) account.riderOnline = online;
    this.saveSample();
  }

  async listDeliveries(): Promise<RiderDelivery[]> {
    await this.ready();
    const session = this.currentSession();
    if (!session) return [];
    const link = this.linkFor(session.scope);
    const list = link ? link.deliveries : this.currentSample().deliveries.filter((d) => d.riderId === session.riderId);
    const tapped = this.pickups();
    return list.map((d) => ({ ...d, pickupTappedAt: tapped[pickupKey(d)] ?? null }));
  }

  private pickups(): Record<string, string> {
    try {
      return JSON.parse(this.sessionStore().getItem(PICKUPS_KEY) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  async confirmPickup(id: string): Promise<void> {
    const delivery = await this.getDelivery(id);
    if (delivery.status !== 'RIDER_ASSIGNED' || delivery.pickupTappedAt) return;
    try {
      this.sessionStore().setItem(PICKUPS_KEY, JSON.stringify({ ...this.pickups(), [pickupKey(delivery)]: nowIso() }));
    } catch {
      throw new ApiError('CONFLICT', t('app.errorBody'));
    }
    this.emit();
  }

  async getDelivery(id: string): Promise<RiderDelivery> {
    const found = (await this.listDeliveries()).find((d) => d.id === id);
    if (!found) throw new ApiError('NOT_FOUND', t('delivery.gone'));
    return found;
  }

  /** Today's deliveries, plus sample older days on sample data. The DEMO link knows only today. */
  async listHistory(): Promise<RiderPastDelivery[]> {
    const today: RiderPastDelivery[] = (await this.listDeliveries())
      .filter((d) => d.status === 'DELIVERED')
      .map((d) => ({
        id: d.id,
        dailyNumber: d.dailyNumber,
        date: d.deliveredAt ? dateKey(new Date(d.deliveredAt)) : daysAgoKey(0),
        area: d.area ?? deliveryAreaLabel(d.customerAddress),
        total: d.total,
        cashCollected: d.cashCollected,
        cashSettled: d.cashSettled,
        canOpen: true,
      }));
    const older: RiderPastDelivery[] = this.source() === 'SAMPLE'
      ? DEMO_PAST_DELIVERIES.map((p) => ({
          id: `past-${p.number}`,
          dailyNumber: p.number,
          date: daysAgoKey(p.daysAgo),
          area: p.area,
          total: rupeesToPaisa(p.rupees),
          cashCollected: p.cod ? rupeesToPaisa(p.rupees) : 0,
          cashSettled: p.cod,
          canOpen: false,
        }))
      : [];
    return [...today.sort((a, b) => b.dailyNumber - a.dailyNumber), ...older];
  }

  async getDaySummary(date: string): Promise<RiderDaySummary> {
    const finished = (await this.listHistory()).filter((d) => d.date === date);
    const sample = this.source() === 'SAMPLE' ? DEMO_EARNINGS.find((e) => daysAgoKey(e.daysAgo) === date) : undefined;
    return {
      date,
      totals: riderDayTotals(finished.map((d) => ({ status: 'DELIVERED', cashCollected: d.cashCollected, cashSettled: d.cashSettled }))),
      earnings: sample
        ? {
            deliveryFees: rupeesToPaisa(sample.fees),
            tips: rupeesToPaisa(sample.tips),
            bonus: rupeesToPaisa(sample.bonus),
            total: rupeesToPaisa(sample.fees + sample.tips + sample.bonus),
          }
        : null,
    };
  }

  private sampleStep(id: string, to: 'OUT_FOR_DELIVERY' | 'DELIVERED'): void {
    const session = this.currentSession();
    const delivery = this.currentSample().deliveries.find((d) => d.id === id && d.riderId === session?.riderId);
    if (!delivery) throw new ApiError('NOT_FOUND', t('delivery.gone'));
    if (delivery.status === to) return;
    const check = checkTransition({ type: 'DELIVERY', from: delivery.status, to, role: 'RIDER', isAssignedRider: true });
    if (!check.ok) throw new ApiError('CONFLICT', t('delivery.wrongStep'));
    delivery.status = to;
    if (to === 'OUT_FOR_DELIVERY') delivery.pickedUpAt = nowIso();
    else {
      delivery.deliveredAt = nowIso();
      delivery.cashCollected = delivery.amountToCollect;
      delivery.amountToCollect = 0;
    }
    this.saveSample();
  }

  async pickedUp(id: string): Promise<void> {
    await this.ready();
    const session = this.currentSession();
    if (session && this.linkFor(session.scope)) return this.command({ kind: 'PICKED_UP', riderId: session.riderId, orderId: id });
    this.sampleStep(id, 'OUT_FOR_DELIVERY');
  }

  async delivered(id: string): Promise<void> {
    await this.ready();
    const session = this.currentSession();
    if (session && this.linkFor(session.scope)) return this.command({ kind: 'DELIVERED', riderId: session.riderId, orderId: id });
    this.sampleStep(id, 'DELIVERED');
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  // ── DEMO buttons ─────────────────────────────────────────────────────────────────────────

  source(): DemoSource {
    if (!this.link) return 'SAMPLE';
    return this.linkLost ? 'RESTAURANT_OS_LOST' : 'RESTAURANT_OS';
  }

  /** Stands in for the cashier assigning this rider a new order. An Offline rider gets none. */
  async giveNewOrder(): Promise<void> {
    await this.ready();
    const session = this.currentSession();
    const branch = this.currentSample();
    if (!session) throw new ApiError('FORBIDDEN', t('login.again'));
    if (branch.riders.find((a) => a.id === session.riderId)?.riderOnline === false) throw new ApiError('CONFLICT', t('deliveries.offlineNoOrder'));
    const next = DEMO_NEW_ORDERS[branch.newOrders % DEMO_NEW_ORDERS.length] ?? DEMO_NEW_ORDERS[0]!;
    const total = rupeesToPaisa(next.rupees);
    branch.newOrders += 1;
    branch.deliveries.push({
      id: newId(),
      riderId: session.riderId,
      dailyNumber: branch.nextNumber++,
      status: 'RIDER_ASSIGNED',
      customerName: next.customerName,
      customerPhone: next.customerPhone,
      customerAddress: next.customerAddress,
      note: '',
      items: next.items.map(([label, rupees], i) => ({ id: `item-${i + 1}`, label, note: '', lineTotal: rupeesToPaisa(rupees) })),
      total,
      amountToCollect: total,
      cashCollected: 0,
      cashSettled: false,
      assignedAt: nowIso(),
      pickedUpAt: null,
      deliveredAt: null,
    });
    this.saveSample();
  }

  /** Stands in for the cashier taking this rider's cash. */
  async handOverCash(): Promise<void> {
    await this.ready();
    const session = this.currentSession();
    for (const d of this.currentSample().deliveries) {
      if (d.riderId === session?.riderId && d.status === 'DELIVERED') d.cashSettled = true;
    }
    this.saveSample();
  }

  resetSample(): void {
    try {
      this.sessionStore().removeItem(PICKUPS_KEY);
    } catch {
      // Storage blocked: there is nothing saved to clear.
    }
    this.sample = startSample();
    this.saveSample();
  }
}
