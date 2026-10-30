// DEMO
import { amountToMinimum, calculateBill, nextTrackingStep, normalizePhone, unitPriceFor, type DraftItemInput } from '@restaurant-saas/shared';
import { rs } from '../../format';
import { checkOrderDetails, stepsKind } from '../../order-rules';
import { ApiError, type CustomerOrder, type CustomerProfile, type CustomerStore, type DemoControls, type PlaceOrderInput, type StoreApi } from '../client';
import { DEMO_CLOSED_AT_START, DEMO_RIDER, DEMO_STORES } from './seed';

/**
 * Phase 2 implementation of the StoreApi: sample data in this browser (localStorage), shared with its other tabs.
 * It behaves like the future server — prices are worked out here from the menu, never taken from the screen —
 * but it is NOT a security boundary, and it is not joined to Restaurant OS until the backend exists (Phase 4).
 */
const KEY = 'lala-store-demo-v2';

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

  private read(): DemoState {
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
    // Item OFF = hidden: the website never receives it, also not through a deal or a suggestion.
    const items = seed.items.filter((i) => i.isOnline && !i.archivedAt);
    const onMenu = (itemId: string) => items.some((i) => i.id === itemId);
    return {
      ...seed,
      isOpen: switches.open,
      onlineOrdersEnabled: switches.online,
      items,
      deals: seed.deals.filter((d) => onMenu(d.itemId)),
      popularItemIds: seed.popularItemIds.filter(onMenu),
      bestsellerItemIds: seed.bestsellerItemIds.filter(onMenu),
      suggestedItemIds: seed.suggestedItemIds.filter(onMenu),
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
    await wait();
    return clone(this.publicStore(restaurantSlug, branchSlug));
  }

  async placeOrder(input: PlaceOrderInput): Promise<{ token: string }> {
    await wait();
    const state = this.read();
    const repeated = state.idempotency[input.idempotencyKey];
    if (repeated) return { token: repeated };
    const store = this.publicStore(input.restaurantSlug, input.branchSlug);
    if (!store.onlineOrdersEnabled || !store.isOpen) throw new ApiError('CONFLICT', 'Not taking orders right now.');
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
    const today = new Date().toISOString().slice(0, 10);
    const counterKey = `${input.restaurantSlug}/${input.branchSlug}/${today}`;
    const dailyNumber = (state.dailyCounters[counterKey] ?? 0) + 1;
    state.dailyCounters[counterKey] = dailyNumber;
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
    state.orders.unshift({
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
      totals,
      prepMinutes: store.defaultPrepMinutes,
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
