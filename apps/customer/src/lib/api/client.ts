import type { DraftItemInput, OnlineOrderKind, PublicStore, TrackedOrder } from '@restaurant-saas/shared';

/**
 * The one data contract of the Customer website (PROJECT_RULES.md §16).
 *
 *   screen → StoreApi ─┬─ DemoAdapter   Phase 2: sample data in this browser
 *                      └─ HttpAdapter   Phase 4+: the real API, same shapes
 *
 * Screens use only this interface, so connecting the backend never means rebuilding screens.
 * The browser sends only what was chosen; prices are always calculated on the other side.
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

export interface PlaceOrderInput {
  restaurantSlug: string;
  branchSlug: string;
  kind: OnlineOrderKind;
  name: string;
  phone: string;
  address: string;
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
  getStore(restaurantSlug: string, branchSlug: string): Promise<PublicStore>;
  placeOrder(input: PlaceOrderInput): Promise<{ token: string }>;
  getTrackedOrder(token: string): Promise<TrackedOrder>;
  /** Orders placed on this device for this branch, newest first */
  listMyOrders(restaurantSlug: string, branchSlug: string): Promise<TrackedOrder[]>;
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
