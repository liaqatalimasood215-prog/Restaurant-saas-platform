import type { OsSectionKey, StaffRole } from '@restaurant-saas/shared';
import { t } from '@/i18n';

/** Sidebar label of a section; the Service Waiter's waiter screen is about serving, not ordering. */
export function sectionLabel(key: OsSectionKey, role: StaffRole | undefined): string {
  if (key === 'waiter' && role === 'SERVICE_WAITER') return t('nav.serveFood');
  return t(`nav.${key}`);
}
