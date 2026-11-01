import type { RiderAccount, RiderDelivery } from '@restaurant-saas/shared';

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
}

export interface RiderApi {
  getBranch(restaurant: string, branch: string): Promise<RiderBranch>;
  /** DEMO login: pick an account. Real phone + password login comes with the server (Phase 4). */
  listAccounts(restaurant: string, branch: string): Promise<RiderAccount[]>;
  login(restaurant: string, branch: string, riderId: string): Promise<void>;
  logout(): Promise<void>;
  /** The logged-in rider of this branch; null = logged out (also when the account was disabled). */
  getMe(restaurant: string, branch: string): Promise<RiderAccount | null>;
  setOnline(online: boolean): Promise<void>;
  /** This rider's deliveries of the day and any still running; never another rider's. */
  listDeliveries(): Promise<RiderDelivery[]>;
  getDelivery(id: string): Promise<RiderDelivery>;
  /** Picked up – On the way. A repeated tap changes nothing. */
  pickedUp(id: string): Promise<void>;
  /** Delivered, and any cash to collect is taken. A repeated tap changes nothing. */
  delivered(id: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}

/** Where the data comes from right now (DEMO only). */
export type DemoSource = 'SAMPLE' | 'RESTAURANT_OS' | 'RESTAURANT_OS_LOST';

/** DEMO buttons of the sample data; gone in Phase 4. */
export interface DemoControls {
  source(): DemoSource;
  giveNewOrder(): Promise<void>;
  handOverCash(): Promise<void>;
  resetSample(): void;
}
