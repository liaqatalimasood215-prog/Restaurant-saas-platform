'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { OsSection } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { Logo } from './logo';
import { SectionIcon } from './section-icon';
import { sectionLabel } from './section-label';
import { useIsActive, useVisibleSections } from './use-sections';

const COLLAPSED_KEY = 'lala-os-sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Left sidebar, always visible on tablet and desktop (owner decision 2026-10-27).
 * Below 1024 px: icon rail with short labels. From 1024 px: full names, with a Collapse button
 * that turns it into the icon rail (remembered in this browser).
 */
export function Sidebar() {
  const { features, comingSoon } = useVisibleSections();
  const isActive = useIsActive();
  // The shell renders only after the session loads in the browser, so localStorage is available.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const wide = !collapsed;

  const toggle = () => {
    setCollapsed(wide);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, wide ? '1' : '0');
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  };

  return (
    <aside
      aria-label={t('nav.mainMenu')}
      className={cn('sticky top-0 hidden h-dvh w-24 shrink-0 flex-col bg-navy text-slate-200 md:flex', wide && 'lg:w-56')}
    >
      <div className={cn('flex h-16 items-center justify-center border-b border-white/10 px-3', wide && 'lg:justify-start lg:px-4')}>
        <Logo compact dark iconOnly={collapsed} />
      </div>

      <nav className={cn('flex-1 overflow-y-auto px-2 py-3 short:py-2', wide && 'lg:px-3')}>
        <ul className="space-y-1.5 short:space-y-1">
          {features.map((section) => (
            <li key={section.key}>
              <FeatureLink section={section} active={isActive(section)} wide={wide} />
            </li>
          ))}
        </ul>

        {comingSoon.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className={cn('mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400', wide && 'lg:px-3 lg:text-left lg:text-[11px]')}>
              {t('nav.comingSoon')}
            </p>
            <ul className="space-y-0.5">
              {comingSoon.map((section) => (
                <li key={section.key}>
                  <ComingSoonLink section={section} active={isActive(section)} wide={wide} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="hidden border-t border-white/10 p-2 lg:block">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={wide}
          title={wide ? t('nav.collapse') : t('nav.expand')}
          className={cn(
            'flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white',
            wide && 'justify-start px-3',
          )}
        >
          {wide ? <ChevronsLeft className="size-5" aria-hidden /> : <ChevronsRight className="size-5" aria-hidden />}
          {wide ? t('nav.collapse') : <span className="sr-only">{t('nav.expand')}</span>}
        </button>
      </div>
    </aside>
  );
}

function FeatureLink({ section, active, wide }: { section: OsSection; active: boolean; wide: boolean }) {
  const role = useSession().data?.user.role;
  const label = sectionLabel(section.key, role);
  return (
    <Link
      href={section.path}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors',
        wide && 'lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:py-2 lg:text-left short:lg:min-h-10',
        active ? 'bg-brand text-white shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white',
      )}
    >
      <SectionIcon sectionKey={section.key} className="size-5 shrink-0" />
      <span className={cn('text-[10px] font-semibold leading-tight', wide && 'lg:flex-1 lg:text-[15px]')}>{label}</span>
      {active && wide && <ChevronRight className="hidden size-4 shrink-0 lg:block" aria-hidden />}
    </Link>
  );
}

function ComingSoonLink({ section, active, wide }: { section: OsSection; active: boolean; wide: boolean }) {
  const role = useSession().data?.user.role;
  const label = sectionLabel(section.key, role);
  return (
    <Link
      href={section.path}
      aria-current={active ? 'page' : undefined}
      title={`${label} — ${t('nav.comingSoon')}`}
      className={cn(
        'flex min-h-10 items-center justify-center gap-3 rounded-lg px-2 text-sm transition-colors',
        wide && 'lg:justify-start lg:px-3',
        active ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200',
      )}
    >
      <SectionIcon sectionKey={section.key} className="size-4 shrink-0" />
      <span className={cn('hidden flex-1 truncate', wide && 'lg:block')}>{label}</span>
      <span className={cn('hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300', wide && 'lg:block')}>
        {t('nav.phaseShort', { phase: section.phase })}
      </span>
    </Link>
  );
}
