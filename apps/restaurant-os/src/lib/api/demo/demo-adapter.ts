import { STAFF_ROLES, type StaffRole, type StaffUser } from '@restaurant-saas/shared';
import { ApiError, type ApiClient, type DemoControls, type Session } from '../client';
import { DemoStore } from './store';

/** A short random delay so loading states are visible, like a real network. */
const MIN_DELAY_MS = 150;
const MAX_DELAY_MS = 350;

function wait(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Phase 1–3 implementation of the ApiClient: in-memory DEMO data, shared rules from
 * packages/shared. It behaves like the future server (same shapes, same rule checks), but it is
 * NOT a security boundary — everything runs in the browser.
 */
export class DemoAdapter implements ApiClient, DemoControls {
  private readonly store = new DemoStore();

  private async request<T>(work: () => T): Promise<T> {
    await wait();
    if (this.store.isSimulatingFailure()) {
      throw new ApiError('NETWORK', 'Simulated connection error (DEMO)');
    }
    return work();
  }

  private demoUserFor(role: StaffRole): StaffUser {
    const user = this.store.read().staff.find((s) => s.role === role && s.isActive);
    if (!user) throw new ApiError('NOT_FOUND', `No active demo user with role ${role}`);
    return user;
  }

  getSession(): Promise<Session> {
    return this.request(() => {
      const data = this.store.read();
      const userId = this.store.getSessionUserId();
      const user = data.staff.find((s) => s.id === userId && s.isActive) ?? this.demoUserFor('OWNER');
      return { user, restaurant: data.restaurant, branch: data.branch };
    });
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  listDemoUsers(): StaffUser[] {
    return STAFF_ROLES.map((role) => this.demoUserFor(role));
  }

  switchRole(role: StaffRole): void {
    this.store.setSessionUserId(this.demoUserFor(role).id);
  }

  isSimulatingFailure(): boolean {
    return this.store.isSimulatingFailure();
  }

  setSimulatedFailure(on: boolean): void {
    this.store.setSimulatedFailure(on);
  }

  resetData(): void {
    this.store.reset();
  }
}
