// DEMO
import { CUSTOMER_LINK_ORDER, CUSTOMER_LINK_RESULT, CUSTOMER_LINK_STATUS, CUSTOMER_LINK_TRACK, WEBSITE_PREVIEW_DATA, WEBSITE_PREVIEW_READY, amountToMinimum, calculateBill, formatOpeningHours, isFinalStatus, isWebsitePreviewData, nextTrackingStep, normalizePhone, unitPriceFor, type CustomerLinkOrder, type CustomerLinkPlaced, type CustomerLinkStatus, type DraftItemInput, type WebsitePreviewData } from '@restaurant-saas/shared';
import { en } from '@/i18n/en';
import { rs } from '../../format';
import { checkOrderDetails, stepsKind } from '../../order-rules';
import { announce } from '../../sound';
import { ApiError, ORDER_MODES, type CustomerOrder, type CustomerProfile, type CustomerStore, type DemoControls, type PlaceOrderInput, type StoreApi } from '../client';
import { DEMO_CLOSED_AT_START, DEMO_RIDER, DEMO_STORES } from './seed';
import { newId } from '@/lib/new-id';

/**
 * Phase 2 implementation of the StoreApi: sample data in this browser (localStorage), shared with its other tabs.
 * It behaves like the future server — prices are worked out here from the menu, never taken from the screen —
 * but it is NOT a security boundary, and it is not joined to Restaurant OS until the backend exists (Phase 4).
 */
const KEY = 'lala-store-demo-v2';

/**
 * DEMO link: inside a Restaurant OS preview frame, or a tab opened from it, the page asks Restaurant OS for its menu,
 * prices and switches. Only this address is believed and the shape is checked. A direct visit keeps the sample data.
 */
const RESTAURANT_OS_ORIGIN = 'http://localhost:3000';
const PREVIEW_KEY = 'lala-store-preview';
const PREVIEW_WAIT_MS = 800;
/** The hidden frame has to load first. */
const FRAME_WAIT_MS = 3000;
const FRAME_ASK_EVERY_MS = 300;
const FRAME_ASKS = 100;
const TRACK_EVERY_MS = 1500;
const ORDER_ANSWER_MS = 8000;
/** Only the restaurant in Restaurant OS, on this computer: a phone has no Restaurant OS data and keeps sample data. */
const LINKED_PATH = '/aziz-pizza/main';
const NO_LINK_KEY = 'lala-demo-no-link';

interface DemoState {
  /** "restaurant/branch" → switches */
  switches: Record<string, { online: boolean; open: boolean }>;
  orders: CustomerOrder[];
  /** Idempotency key → order token */
  idempotency: Record<string, string>;
  dailyCounters: Record<string, number>;
  profiles: Record<string, CustomerProfile>;
}

const empty = (): DemoState => ({ switches: {}, orders: [], idempotency: {}, dailyCounters: {}, profiles: {} });
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
const clone = <T>(value: T): T => structuredClone(value);
const startSwitches = (key: string) => ({ online: true, open: !DEMO_CLOSED_AT_START.includes(key) });

export class DemoAdapter implements StoreApi, DemoControls {
  private state: DemoState = empty();
  private loaded = false;
  private listening = false;
  private readonly listeners = new Set<() => void>();
  private preview: WebsitePreviewData | null = null;
  private previewAsked = false;
  private previewArrival: Promise<void> = Promise.resolve();
  private host: Window | null = null;
  private readonly pendingOrders = new Map<string, { resolve: (placed: CustomerLinkPlaced) => void; reject: (err: Error) => void }>();

  /** Asks Restaurant OS once; the first answer is waited for briefly, so the sample menu does not flash first. */
  private askRestaurantOs(): void {
    if (this.previewAsked) return;
    this.previewAsked = true;
    const opened = window.parent !== window ? window.parent : (window.opener as Window | null);
    const frame = opened ? null : this.openLinkFrame();
    const host = opened ?? frame?.contentWindow ?? null;
    if (!host) return;
    this.host = host;
    this.listenToLink();
    try {
      const kept: unknown = JSON.parse(window.sessionStorage.getItem(PREVIEW_KEY) ?? 'null');
      if (isWebsitePreviewData(kept)) this.preview = kept;
    } catch {
      // Storage blocked or broken: wait for Restaurant OS.
    }
    this.previewArrival = new Promise<void>((resolve) => {
      if (this.preview) resolve();
      setTimeout(resolve, frame ? FRAME_WAIT_MS : PREVIEW_WAIT_MS);
      // The frame answers only once its page has started, so keep saying ready until it does.
      if (frame) {
        let asks = 0;
        const asking = window.setInterval(() => {
          asks += 1;
          if (this.preview || asks > FRAME_ASKS) return window.clearInterval(asking);
          host.postMessage({ type: WEBSITE_PREVIEW_READY }, RESTAURANT_OS_ORIGIN);
        }, FRAME_ASK_EVERY_MS);
      }
      window.addEventListener('message', (event) => {
        if (event.origin !== RESTAURANT_OS_ORIGIN || event.data?.type !== WEBSITE_PREVIEW_DATA || !isWebsitePreviewData(event.data.data)) return;
        this.preview = event.data.data;
        try {
          window.sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(this.preview));
        } catch {
          // Storage blocked: it still works until a reload.
        }
        resolve();
        this.emit();
      });
    });
    host.postMessage({ type: WEBSITE_PREVIEW_READY }, RESTAURANT_OS_ORIGIN);
  }

  /** A direct visit on this computer reaches Restaurant OS through a hidden page of it (apps/restaurant-os/src/app/demo-link). */
  private openLinkFrame(): HTMLIFrameElement | null {
    if (window.location.hostname !== 'localhost' || !window.location.pathname.startsWith(LINKED_PATH)) return null;
    try {
      if (window.localStorage.getItem(NO_LINK_KEY)) return null;
    } catch {
      return null;
    }
    const frame = document.createElement('iframe');
    frame.src = `${RESTAURANT_OS_ORIGIN}/demo-link`;
    frame.hidden = true;
    frame.title = 'DEMO link';
    document.body.append(frame);
    return frame;
  }

  /** Answers to orders, and the steps of orders that went to Restaurant OS. */
  private listenToLink(): void {
    window.addEventListener('message', (event) => {
      if (event.origin !== RESTAURANT_OS_ORIGIN) return;
      if (event.data?.type === CUSTOMER_LINK_RESULT) {
        const waiting = this.pendingOrders.get(event.data.id);
        this.pendingOrders.delete(event.data.id);
        if (event.data.error) waiting?.reject(new ApiError('CONFLICT', String(event.data.error)));
        else waiting?.resolve(event.data.placed as CustomerLinkPlaced);
      } else if (event.data?.type === CUSTOMER_LINK_STATUS && Array.isArray(event.data.orders)) {
        this.applyLinkStatus(event.data.orders as CustomerLinkStatus[]);
      }
    });
    window.setInterval(() => {
      const tokens = this.read().orders.filter((o) => o.linked && !isFinalStatus(o.status)).map((o) => o.token);
      if (tokens.length > 0) this.host?.postMessage({ type: CUSTOMER_LINK_TRACK, tokens }, RESTAURANT_OS_ORIGIN);
    }, TRACK_EVERY_MS);
  }

  private applyLinkStatus(updates: CustomerLinkStatus[]): void {
    let changed = false;
    for (const update of updates) {
      const order = this.read().orders.find((o) => o.token === update.token);
      if (!order || order.status === update.status) continue;
      order.status = update.status;
      order.prepMinutes = update.prepMinutes;
      order.history = update.history;
      order.rider = update.riderName ? { name: update.riderName, plate: 'DEMO' } : null;
      changed = true;
      // One open tab of the customer speaks, not every tab.
      const speech = en.speech[update.status as keyof typeof en.speech];
      if (speech && document.visibilityState === 'visible') announce(speech);
    }
    if (changed) this.write();
  }

  private sendToRestaurantOs(order: CustomerLinkOrder): Promise<CustomerLinkPlaced> {
    const id = newId();
    return new Promise<CustomerLinkPlaced>((resolve, reject) => {
      this.pendingOrders.set(id, { resolve, reject });
      this.host?.postMessage({ type: CUSTOMER_LINK_ORDER, id, order }, RESTAURANT_OS_ORIGIN);
      setTimeout(() => {
        if (this.pendingOrders.delete(id)) reject(new ApiError('CONFLICT', 'Restaurant OS is not answering. Open it on this computer and try again.'));
      }, ORDER_ANSWER_MS);
    });
  }

  private read(): DemoState {
    this.askRestaurantOs();
    if (!this.loaded) {
      this.loaded = true;
      try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) this.state = { ...empty(), ...(JSON.parse(raw) as DemoState) };
      } catch {
        // Storage blocked or broken: the demo starts fresh in memory.
      }
    }
    if (!this.listening) {
      this.listening = true;
      window.addEventListener('storage', (event) => {
        if (event.key !== KEY) return;
        this.loaded = false;
        this.emit();
      });
    }
    return this.state;
  }

  private write(): void {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // Storage blocked or full: the demo keeps working in memory for this tab.
    }
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private seed(restaurantSlug: string, branchSlug: string) {
    const store = DEMO_STORES.find((s) => s.restaurant.slug === restaurantSlug && s.branch.slug === branchSlug);
    if (!store) throw new ApiError('NOT_FOUND', 'This restaurant was not found.');
    return store;
  }

  private publicStore(restaurantSlug: string, branchSlug: string): CustomerStore {
    const seed = this.seed(restaurantSlug, branchSlug);
    const key = `${restaurantSlug}/${branchSlug}`;
    const switches = this.read().switches[key] ?? startSwitches(key);
    const preview = this.preview?.restaurant.slug === restaurantSlug && this.preview.branch.slug === branchSlug ? this.preview : null;
    const website = preview?.website;
    // Item OFF = hidden: the website never receives it, also not through a deal or a suggestion.
    const items = (preview?.items ?? seed.items).filter((i) => i.isOnline && !i.archivedAt && (website?.menu.showSoldOut !== false || i.isAvailable));
    // Best sellers and suggestions name dishes of the sample menu: they follow the dish with the same name in the Restaurant OS menu.
    const onMenu = (seedItemId: string): string | null => {
      const name = seed.items.find((i) => i.id === seedItemId)?.name;
      return items.find((i) => i.id === seedItemId || i.name === name)?.id ?? null;
    };
    const onMenuList = (ids: string[]) => ids.flatMap((id) => onMenu(id) ?? []);
    const offered = (itemId: string) => items.some((i) => i.id === itemId);
    return {
      ...seed,
      ...(preview && {
        restaurant: { ...seed.restaurant, name: preview.restaurant.name },
        branch: { ...seed.branch, name: preview.branch.name, phone: preview.branch.phone, address: preview.branch.address, openingHours: website ? formatOpeningHours(website.hours) : seed.branch.openingHours },
        deliveryFee: preview.deliveryFee,
        minOrder: preview.minOrder,
        defaultPrepMinutes: preview.defaultPrepMinutes,
        pricing: preview.pricing,
        categories: preview.categories,
        addonGroups: preview.addonGroups,
      }),
      ...(website && {
        brand: { ...seed.brand, ...website.brand, wordmark: website.brand.wordmark.trim() || null, headline: website.brand.headline.trim() || null },
      }),
      fromRestaurantOs: Boolean(preview),
      modes: website ? ORDER_MODES.filter((m) => (m === 'DELIVERY' ? website.modes.delivery : m === 'TAKEAWAY' ? website.modes.pickup : website.modes.dineIn)) : [...ORDER_MODES],
      display: {
        showCategories: website?.homepage.showCategories ?? true,
        showDeals: website?.homepage.showDeals ?? true,
        showPopular: website?.homepage.showPopular ?? true,
        showDescriptions: website?.menu.showDescriptions ?? true,
      },
      about: website?.brand.description.trim() ?? '',
      links: website?.contact ?? { whatsapp: '', email: '', facebook: '', instagram: '' },
      isOpen: switches.open,
      onlineOrdersEnabled: switches.online && (preview?.onlineOrdersEnabled ?? true),
      items,
      deals: website
        ? website.homepage.deals.filter((d) => offered(d.itemId)).map((d, i) => ({ id: `deal-${i}`, tag: d.tag.trim(), itemId: d.itemId, emoji: [] }))
        : seed.deals.flatMap((d) => {
            const itemId = onMenu(d.itemId);
            return itemId ? [{ ...d, itemId }] : [];
          }),
      popularItemIds: website ? website.homepage.popularItemIds.filter(offered) : onMenuList(seed.popularItemIds),
      bestsellerItemIds: onMenuList(seed.bestsellerItemIds),
      suggestedItemIds: onMenuList(seed.suggestedItemIds),
      branches: DEMO_STORES.filter((s) => s.restaurant.slug === restaurantSlug).map((s) => {
        const branchKey = `${restaurantSlug}/${s.branch.slug}`;
        return { name: s.branch.name, slug: s.branch.slug, address: s.branch.address, isOpen: (this.read().switches[branchKey] ?? startSwitches(branchKey)).open };
      }),
    };
  }

  subscribe(listener: () => void): () => void {
    this.read();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getStore(restaurantSlug: string, branchSlug: string): Promise<CustomerStore> {
    this.read();
    await Promise.all([wait(), this.previewArrival]);
    return clone(this.publicStore(restaurantSlug, branchSlug));
  }

  async placeOrder(input: PlaceOrderInput): Promise<{ token: string }> {
    await wait();
    const state = this.read();
    const repeated = state.idempotency[input.idempotencyKey];
    if (repeated) return { token: repeated };
    const store = this.publicStore(input.restaurantSlug, input.branchSlug);
    if (!store.onlineOrdersEnabled || !store.isOpen) throw new ApiError('CONFLICT', 'Not taking orders right now.');
    if (!store.modes.includes(input.mode)) throw new ApiError('CONFLICT', 'This way of ordering is switched off right now.');
    if (input.lines.length === 0) throw new ApiError('VALIDATION', 'Your cart is empty.');
    const problem = checkOrderDetails(input);
    if (problem) throw new ApiError('VALIDATION', 'Please check your details.');

    const items = input.lines.map((line) => this.priceLine(store, line));
    const totals = calculateBill({
      orderType: input.mode,
      lines: items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })),
      deliveryFee: store.deliveryFee,
      settings: store.pricing,
    });
    if (amountToMinimum(totals.itemsSubtotal, store.minOrder) > 0) {
      throw new ApiError('CONFLICT', `The minimum order is ${rs(store.minOrder)}.`);
    }
    // Restaurant OS makes the one order and prices it; this page keeps a copy for its tracking screen.
    const linked =
      store.fromRestaurantOs && this.host && input.mode !== 'DINE_IN'
        ? await this.sendToRestaurantOs({ type: input.mode, name: input.name, phone: input.phone, address: input.address, note: input.note, lines: input.lines, idempotencyKey: input.idempotencyKey })
        : null;
    const today = new Date().toISOString().slice(0, 10);
    const counterKey = `${input.restaurantSlug}/${input.branchSlug}/${today}`;
    const dailyNumber = linked ? linked.dailyNumber : (state.dailyCounters[counterKey] ?? 0) + 1;
    if (!linked) state.dailyCounters[counterKey] = dailyNumber;
    const token = linked ? linked.token : [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
    state.orders.unshift({
      linked: Boolean(linked),
      token,
      restaurantSlug: input.restaurantSlug,
      branchSlug: input.branchSlug,
      restaurantName: store.restaurant.name,
      restaurantPhone: store.branch.phone,
      kind: stepsKind(input.mode),
      mode: input.mode,
      tableNumber: input.mode === 'DINE_IN' ? input.tableNumber.trim() : '',
      payment: input.payment,
      rider: null,
      status: 'PLACED',
      dailyNumber,
      customerName: input.name.trim(),
      customerPhone: normalizePhone(input.phone) ?? input.phone,
      customerAddress: input.mode === 'DELIVERY' ? input.address.trim() : '',
      note: input.note.trim(),
      items: items.map((i) => ({ name: i.name, variantName: i.variantName, modifiers: i.modifiers, quantity: i.quantity, unit: i.unit, lineTotal: i.lineTotal, note: i.note })),
      lines: input.lines,
      totals: linked ? linked.totals : totals,
      prepMinutes: linked ? linked.prepMinutes : store.defaultPrepMinutes,
      history: [{ status: 'PLACED', at: new Date().toISOString() }],
    });
    state.idempotency[input.idempotencyKey] = token;
    this.write();
    return { token };
  }

  /** Name, size, add-ons and price come from the menu; the screen only says what was chosen. */
  private priceLine(store: CustomerStore, line: DraftItemInput) {
    const item = store.items.find((i) => i.id === line.menuItemId);
    if (!item) throw new ApiError('CONFLICT', 'An item in your cart is no longer available.');
    if (!item.isAvailable) throw new ApiError('CONFLICT', `${item.name} is sold out.`);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 50) throw new ApiError('VALIDATION', 'Please check the quantity.');
    const variant = item.variants.find((v) => v.id === line.variantId) ?? null;
    if (item.variants.length > 0 && !variant) throw new ApiError('VALIDATION', `Choose a size for ${item.name}.`);
    const groups = store.addonGroups.filter((g) => item.modifierGroupIds.includes(g.id));
    const modifiers = groups.flatMap((g) => g.modifiers).filter((m) => line.modifierIds.includes(m.id));
    if (modifiers.length !== new Set(line.modifierIds).size) throw new ApiError('VALIDATION', 'Please check the add-ons.');
    const unitPrice = unitPriceFor({ basePrice: item.basePrice, variantPrice: variant?.price, modifierPrices: modifiers.map((m) => m.price) });
    return {
      name: item.name,
      variantName: variant?.name ?? null,
      modifiers: modifiers.map((m) => m.name),
      quantity: line.quantity,
      unit: item.unit,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      note: line.note.trim(),
    };
  }

  async getTrackedOrder(token: string): Promise<CustomerOrder> {
    await wait();
    const order = this.read().orders.find((o) => o.token === token);
    if (!order) throw new ApiError('NOT_FOUND', 'This tracking link was not found.');
    return clone(order);
  }

  async listMyOrders(restaurantSlug: string, branchSlug: string): Promise<CustomerOrder[]> {
    await wait();
    return clone(this.read().orders.filter((o) => o.restaurantSlug === restaurantSlug && o.branchSlug === branchSlug));
  }

  async getProfile(restaurantSlug: string): Promise<CustomerProfile> {
    await wait();
    return clone(this.read().profiles[restaurantSlug] ?? { signedIn: false, name: '', phone: '', addresses: [] });
  }

  async saveProfile(restaurantSlug: string, profile: CustomerProfile): Promise<void> {
    await wait();
    this.read().profiles[restaurantSlug] = clone(profile);
    this.write();
  }

  // ── DEMO controls ──────────────────────────────────────────────────────────────────────────

  private switches(restaurantSlug: string, branchSlug: string) {
    const key = `${restaurantSlug}/${branchSlug}`;
    const all = this.read().switches;
    return (all[key] ??= startSwitches(key));
  }

  setOnlineOrders(restaurantSlug: string, branchSlug: string, enabled: boolean): void {
    this.switches(restaurantSlug, branchSlug).online = enabled;
    this.write();
  }

  setOpen(restaurantSlug: string, branchSlug: string, open: boolean): void {
    this.switches(restaurantSlug, branchSlug).open = open;
    this.write();
  }

  nextOrderStep(token: string): void {
    const order = this.read().orders.find((o) => o.token === token);
    if (!order) return;
    const next = nextTrackingStep(order.kind, order.status);
    if (!next) return;
    order.status = next;
    if (next === 'RIDER_ASSIGNED') order.rider = DEMO_RIDER;
    order.history.push({ status: next, at: new Date().toISOString() });
    this.write();
  }

  rejectOrder(token: string): void {
    const order = this.read().orders.find((o) => o.token === token);
    if (!order || order.status !== 'PLACED') return;
    order.status = 'REJECTED';
    order.history.push({ status: 'REJECTED', at: new Date().toISOString() });
    this.write();
  }

  resetData(): void {
    this.read();
    this.state = empty();
    this.write();
  }
}
