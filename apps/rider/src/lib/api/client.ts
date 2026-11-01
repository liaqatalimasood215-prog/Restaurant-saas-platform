import type { Paisa, RiderAccount, RiderDayTotals, RiderDelivery } from '@restaurant-saas/shared';

/**
 * The one data contract of the Rider App (PROJECT_RULES.md §16).
 *
 *   screen → RiderApi ─┬─ DemoAdapter   Phase 3: sample data, or Restaurant OS in this browser through a DEMO link
 *                      └─ HttpAdapter   Phase 4+: the real API, same shapes
 *
 * Screens use only this interface. The server takes the rider from the login, never from the screen.
 */
export type ApiErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RiderBranch {
  restaurantName: string;
  branchName: string;
  logoText: string;
  primaryColor: string;
  /** The rider calls the restaurant on this number */
  phone: string;
  /** This restaurant's login picture; missing = its name on a plain panel */
  heroImage?: string;
}

/** One finished delivery in Delivery History: an area, never a customer's name or phone. */
export interface RiderPastDelivery {
  id: string;
  dailyNumber: number;
  /** "2026-11-01" */
  date: string;
  area: string;
  total: Paisa;
  cashCollected: Paisa;
  cashSettled: boolean;
  /** Today's deliveries can still be opened */
  canOpen: boolean;
}

/** The rider's own money. COD cash is never part of this: it belongs to the restaurant. */
export interface RiderEarnings {
  deliveryFees: Paisa;
  tips: Paisa;
  bonus: Paisa;
  total: Paisa;
}

export interface RiderDaySummary {
  date: string;
  /** Deliveries and the restaurant's cash */
  totals: RiderDayTotals;
  /** null = nothing to show for this day. The server calculates this from Phase 4. */
  earnings: RiderEarnings | null;
}

export interface RiderApi {
  getBranch(restaurant: string, branch: string): Promise<RiderBranch>;
  /** Phone (standard form) + PIN or password. DEMO: the PIN is not checked; the real check comes with the server. */
  login(restaurant: string, branch: string, phone: string, pin: string): Promise<void>;
  logout(): Promise<void>;
  /** The logged-in rider of this branch; null = logged out (also when the account was disabled). */
  getMe(restaurant: string, branch: string): Promise<RiderAccount | null>;
  setOnline(online: boolean): Promise<void>;
  /** This rider's deliveries of the day and any still running; never another rider's. */
  listDeliveries(): Promise<RiderDelivery[]>;
  getDelivery(id: string): Promise<RiderDelivery>;
  /**
   * DEMO step: the rider has the food. The order status does not change and Restaurant OS does not see it (riderStage in
   * packages/shared). A repeated tap changes nothing.
   */
  confirmPickup(id: string): Promise<void>;
  /** Start Delivery: RIDER_ASSIGNED → OUT_FOR_DELIVERY. A repeated tap changes nothing. */
  pickedUp(id: string): Promise<void>;
  /** Delivered, and any cash to collect is taken. A repeated tap changes nothing. */
  delivered(id: string): Promise<void>;
  /** This rider's finished deliveries, newest first. */
  listHistory(): Promise<RiderPastDelivery[]>;
  getDaySummary(date: string): Promise<RiderDaySummary>;
  subscribe(listener: () => void): () => void;
}

/** Where the data comes from right now (DEMO only). */
export type DemoSource = 'SAMPLE' | 'RESTAURANT_OS' | 'RESTAURANT_OS_LOST';

/** DEMO buttons of the sample data; gone in Phase 4. */
export interface DemoControls {
  source(): DemoSource;
  /** The accounts behind the DEMO buttons on the login page. */
  listAccounts(restaurant: string, branch: string): Promise<RiderAccount[]>;
  demoPin(): string;
  giveNewOrder(): Promise<void>;
  handOverCash(): Promise<void>;
  resetSample(): void;
}
