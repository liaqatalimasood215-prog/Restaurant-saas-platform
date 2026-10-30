import type { DemoControls, StoreApi } from './client';
import { DemoAdapter } from './demo/demo-adapter';
import { DEMO_STORES } from './demo/seed';

export { ApiError } from './client';
export type { CustomerProfile, DemoControls, PlaceOrderInput, StoreApi } from './client';

let adapter: DemoAdapter | null = null;

function demoAdapter(): DemoAdapter {
  adapter ??= new DemoAdapter();
  return adapter;
}

/** Used by every screen. Phase 4 replaces the DemoAdapter here with the HttpAdapter; no screen changes. */
export function getApi(): StoreApi {
  return demoAdapter();
}

/** DEMO buttons that stand in for Restaurant OS — Phase 2 only. */
export function getDemoControls(): DemoControls {
  return demoAdapter();
}

/** Name and colour for page titles and the install manifest (runs on the server, no browser data). */
export function storeIdentity(restaurantSlug: string, branchSlug: string) {
  const seed = DEMO_STORES.find((s) => s.restaurant.slug === restaurantSlug && s.branch.slug === branchSlug);
  return seed ? { name: seed.restaurant.name, tagline: seed.brand.tagline, primaryColor: seed.brand.primaryColor } : null;
}

/** The demo restaurants for the start page. On the real platform each restaurant only shares its own link. */
export function demoStoreList() {
  return DEMO_STORES.map((s) => ({
    name: s.restaurant.name,
    path: `/${s.restaurant.slug}/${s.branch.slug}`,
    tagline: s.brand.tagline,
    logoText: s.brand.logoText,
    primaryColor: s.brand.primaryColor,
  }));
}
