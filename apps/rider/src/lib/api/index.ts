import type { DemoControls, RiderApi } from './client';
import { DemoAdapter } from './demo/demo-adapter';
import { DEMO_BRANCHES } from './demo/seed';

export { ApiError } from './client';
export type { DemoControls, DemoSource, RiderApi, RiderBranch } from './client';

let adapter: DemoAdapter | null = null;

function demoAdapter(): DemoAdapter {
  adapter ??= new DemoAdapter();
  return adapter;
}

/** Used by every screen. Phase 4 replaces the DemoAdapter here with the HttpAdapter; no screen changes. */
export function getApi(): RiderApi {
  return demoAdapter();
}

/** DEMO buttons of the sample data — Phase 3 only. */
export function getDemoControls(): DemoControls {
  return demoAdapter();
}

export const DEMO_START_PATH = '/aziz-pizza/main';

/** Name and colour for page titles and the install manifest (runs on the server, no browser data). */
export function branchIdentity(restaurant: string, branch: string) {
  const seed = DEMO_BRANCHES.find((b) => b.restaurantSlug === restaurant && b.branchSlug === branch);
  return seed ? { name: seed.branch.restaurantName, primaryColor: seed.branch.primaryColor } : null;
}
