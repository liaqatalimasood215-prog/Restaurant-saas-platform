'use client';

import { usePathname } from 'next/navigation';
import { sectionsFor, type OsSection } from '@restaurant-saas/shared';
import { useSession } from '@/lib/session';

/** Sidebar sections the current role may see, split into features and "Coming Soon". */
export function useVisibleSections(): { features: OsSection[]; comingSoon: OsSection[] } {
  const { data: session } = useSession();
  // Each person sees the screens their own permissions allow (owner, 2026-10-29).
  const sections = session ? sectionsFor(session.user.role, session.permissions) : [];
  return {
    features: sections.filter((s) => s.group === 'FEATURES'),
    comingSoon: sections.filter((s) => s.group === 'COMING_SOON'),
  };
}

export function useIsActive(): (section: OsSection) => boolean {
  const pathname = usePathname();
  return (section) => pathname === section.path || pathname.startsWith(`${section.path}/`);
}
