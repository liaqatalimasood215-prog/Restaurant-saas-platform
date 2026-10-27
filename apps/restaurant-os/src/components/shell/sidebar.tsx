'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { OsSection } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { Logo } from './logo';
import { SectionIcon } from './section-icon';
import { useIsActive, useVisibleSections } from './use-sections';

/**
 * Left sidebar, always visible on tablet and desktop (owner decision 2026-10-27).
 * Tablet (md): icon rail with short labels. Desktop (lg): full labels.
 */
export function Sidebar() {
  const { features, comingSoon } = useVisibleSections();
  const isActive = useIsActive();

  return (
    <aside
      aria-label={t('nav.mainMenu')}
      className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col bg-navy text-slate-200 md:flex lg:w-64"
    >
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-3 lg:justify-start lg:px-5">
        <Logo compact dark />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 lg:px-3">
        <ul className="space-y-1">
          {features.map((section) => (
            <li key={section.key}>
              <FeatureLink section={section} active={isActive(section)} />
            </li>
          ))}
        </ul>

        {comingSoon.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:px-3 lg:text-left lg:text-[11px]">
              {t('nav.comingSoon')}
            </p>
            <ul className="space-y-0.5">
              {comingSoon.map((section) => (
                <li key={section.key}>
                  <ComingSoonLink section={section} active={isActive(section)} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}

function FeatureLink({ section, active }: { section: OsSection; active: boolean }) {
  const label = t(`nav.${section.key}`);
  return (
    <Link
      href={section.path}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors',
        'lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:text-left',
        active ? 'bg-brand text-white shadow-sm' : 'text-slate-200 hover:bg-white/10 hover:text-white',
      )}
    >
      <SectionIcon sectionKey={section.key} className="size-5 shrink-0" />
      <span className="text-[10px] font-semibold leading-tight lg:flex-1 lg:text-[15px] lg:font-medium">{label}</span>
      <ChevronRight className="hidden size-4 shrink-0 opacity-60 lg:block" aria-hidden />
    </Link>
  );
}

function ComingSoonLink({ section, active }: { section: OsSection; active: boolean }) {
  const label = t(`nav.${section.key}`);
  return (
    <Link
      href={section.path}
      aria-current={active ? 'page' : undefined}
      title={`${label} — ${t('nav.comingSoon')}`}
      className={cn(
        'flex min-h-10 items-center justify-center gap-3 rounded-lg px-2 text-sm transition-colors lg:justify-start lg:px-3',
        active ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200',
      )}
    >
      <SectionIcon sectionKey={section.key} className="size-4 shrink-0" />
      <span className="hidden flex-1 truncate lg:block">{label}</span>
      <span className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 lg:block">
        {t('nav.phaseShort', { phase: section.phase })}
      </span>
    </Link>
  );
}
