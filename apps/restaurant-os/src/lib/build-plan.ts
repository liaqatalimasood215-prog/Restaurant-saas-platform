import type { OsSectionKey } from '@restaurant-saas/shared';

/**
 * Phase 1 preview order approved by the owner (2026-10-27). Screens that are not built yet show
 * which preview brings them. Removed entry = the screen is built.
 */
export const PREVIEW_FOR_SECTION: Partial<Record<OsSectionKey, number>> = {
  'online-app': 5,
  riders: 5,
  summary: 5,
  settings: 5,
};
