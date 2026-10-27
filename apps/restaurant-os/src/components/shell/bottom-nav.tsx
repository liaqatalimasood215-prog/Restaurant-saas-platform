'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ellipsis } from 'lucide-react';
import type { OsSection } from '@restaurant-saas/shared';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { SectionIcon } from './section-icon';
import { sectionLabel } from './section-label';
import { useIsActive, useVisibleSections } from './use-sections';

const MAX_TABS = 4;

/** Phones: bottom navigation with the role's first sections and a "More" sheet (MASTER_PROMPT.md §7.1). */
export function BottomNav() {
  const role = useSession().data?.user.role;
  const { features, comingSoon } = useVisibleSections();
  const isActive = useIsActive();
  const [moreOpen, setMoreOpen] = useState(false);

  if (features.length === 0) return null;
  const needsMore = features.length > MAX_TABS || comingSoon.length > 0;
  const tabs = needsMore ? features.slice(0, MAX_TABS - 1) : features;
  const moreActive = !tabs.some(isActive) && [...features, ...comingSoon].some(isActive);

  return (
    <>
      <nav
        aria-label={t('nav.mainMenu')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length + (needsMore ? 1 : 0)}, 1fr)` }}>
          {tabs.map((section) => (
            <li key={section.key}>
              <Link
                href={section.path}
                aria-current={isActive(section) ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center',
                  isActive(section) ? 'text-brand' : 'text-slate-500',
                )}
              >
                <SectionIcon sectionKey={section.key} className="size-6" />
                <span className="text-[11px] font-semibold leading-tight">{sectionLabel(section.key, role)}</span>
              </Link>
            </li>
          ))}
          {needsMore && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  'flex min-h-16 w-full flex-col items-center justify-center gap-1',
                  moreActive ? 'text-brand' : 'text-slate-500',
                )}
              >
                <Ellipsis className="size-6" aria-hidden />
                <span className="text-[11px] font-semibold">{t('nav.more')}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.allSections')}>
        <SheetList sections={features} isActive={isActive} onPick={() => setMoreOpen(false)} />
        {comingSoon.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('nav.comingSoon')}</p>
            <SheetList sections={comingSoon} isActive={isActive} onPick={() => setMoreOpen(false)} muted />
          </>
        )}
      </Dialog>
    </>
  );
}

function SheetList({
  sections,
  isActive,
  onPick,
  muted = false,
}: {
  sections: OsSection[];
  isActive: (s: OsSection) => boolean;
  onPick: () => void;
  muted?: boolean;
}) {
  const role = useSession().data?.user.role;
  return (
    <ul className="grid grid-cols-2 gap-2">
      {sections.map((section) => (
        <li key={section.key}>
          <Link
            href={section.path}
            onClick={onPick}
            className={cn(
              'flex min-h-12 items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold leading-tight',
              isActive(section) ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-800',
              muted && !isActive(section) && 'text-slate-500',
            )}
          >
            <SectionIcon sectionKey={section.key} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">{sectionLabel(section.key, role)}</span>
            {muted && (
              <span className="text-[10px] font-bold text-slate-400">
                {t('nav.phaseShort', { phase: section.phase })}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
