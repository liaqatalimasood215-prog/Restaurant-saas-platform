import type { DraftItemInput, OnlineOrderKind, PublicStore, StoreBrand, TrackedOrder } from '@restaurant-saas/shared';

/**
 * The one data contract of the Customer website (PROJECT_RULES.md §16).
 *
 *   screen → StoreApi ─┬─ DemoAdapter   Phase 2: sample data in this browser
 *                      └─ HttpAdapter   Phase 4+: the real API, same shapes
 *
 * Screens use only this interface, so connecting the backend never means rebuilding screens.
 * The browser sends only what was chosen; prices are always calculated on the other side.
 * The extras below stay here until the backend exists; then they move to packages/shared.
 */
export type ApiErrorCode = 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Dine-in is a DEMO option of the website only (lib/order-rules.ts). */
export type OrderMode = OnlineOrderKind | 'DINE_IN';
export const ORDER_MODES: readonly OrderMode[] = ['DELIVERY', 'TAKEAWAY', 'DINE_IN'];

/** Cash is the only real way to pay; the others are screens only (NOT CONNECTED: no money moves). */
export type PaymentChoice = 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'CARD';

export interface CustomerBrand extends StoreBrand {
  /** Second colour (hex): badges and add buttons; dark text must stay readable on it */
  accentColor: string;
  /** Short name shown as the logo, e.g. "LALA"; null = logo letters and the full name */
  wordmark: string | null;
  /** Big line on the login screen; null = "Welcome to …" */
  headline: string | null;
}

/** A banner in the Deal slider. The price is the menu price of its item, so a deal adds no pricing rule. */
export interface StoreDeal {
  id: string;
  tag: string;
  itemId: string;
  emoji: string[];
}

export interface BranchLink {
  name: string;
  slug: string;
  address: string;
  isOpen: boolean;
}

export interface CustomerStore extends PublicStore {
  brand: CustomerBrand;
  /** All branches of this restaurant, for the branch selector */
  branches: BranchLink[];
  deals: StoreDeal[];
  popularItemIds: string[];
  bestsellerItemIds: string[];
  /** "Complete your meal" in the cart */
  suggestedItemIds: string[];
}

/** DEMO: there is no rider system yet; the card shows made-up details. */
export interface SampleRider {
  name: string;
  plate: string;
}

export interface CustomerOrder extends TrackedOrder {
  mode: OrderMode;
  tableNumber: string;
  payment: PaymentChoice;
  /** Set when the rider step is reached */
  rider: SampleRider | null;
}

export interface PlaceOrderInput {
  restaurantSlug: string;
  branchSlug: string;
  mode: OrderMode;
  name: string;
  phone: string;
  address: string;
  tableNumber: string;
  payment: PaymentChoice;
  note: string;
  lines: DraftItemInput[];
  /** One key per tap of "Place order": a double tap or retry never creates a second order. */
  idempotencyKey: string;
}

/** Customer details on this device (no OTP in the prototype; real accounts need paid SMS and approval). */
export interface CustomerProfile {
  signedIn: boolean;
  name: string;
  phone: string;
  addresses: string[];
}

export interface StoreApi {
  getStore(restaurantSlug: string, branchSlug: string): Promise<CustomerStore>;
  placeOrder(input: PlaceOrderInput): Promise<{ token: string }>;
  getTrackedOrder(token: string): Promise<CustomerOrder>;
  /** Orders placed on this device for this branch, newest first */
  listMyOrders(restaurantSlug: string, branchSlug: string): Promise<CustomerOrder[]>;
  getProfile(restaurantSlug: string): Promise<CustomerProfile>;
  saveProfile(restaurantSlug: string, profile: CustomerProfile): Promise<void>;
  /** Called when data may have changed, so screens reload. Phase 2: other tabs of this browser. Phase 5: live events. */
  subscribe(listener: () => void): () => void;
}

/** DEMO-only controls: they stand in for Restaurant OS until the backend joins the two (Phase 4). */
export interface DemoControls {
  setOnlineOrders(restaurantSlug: string, branchSlug: string, enabled: boolean): void;
  setOpen(restaurantSlug: string, branchSlug: string, open: boolean): void;
  /** The restaurant moves the order one step on */
  nextOrderStep(token: string): void;
  rejectOrder(token: string): void;
  resetData(): void;
}
