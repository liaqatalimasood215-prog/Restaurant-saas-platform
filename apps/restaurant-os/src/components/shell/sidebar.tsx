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
 * Left sidebar, always visible on tablet and desktop (owner decision 2026-10-27), in the owner's Red & White
 * design (2026-11-03): white menu between a red top with the logo and a red bottom with Collapse.
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
      className={cn(
        'sticky top-0 z-10 hidden h-dvh w-24 shrink-0 flex-col bg-white text-slate-800 shadow-[4px_0_24px_-16px_rgb(15_23_42/0.35)] md:flex',
        wide && 'lg:w-56',
      )}
    >
      <div className={cn('bg-brand-gradient flex h-16 shrink-0 items-center justify-center rounded-br-[2rem] px-3 shadow-brand', wide && 'lg:justify-start lg:px-4')}>
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
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className={cn('mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500', wide && 'lg:px-3 lg:text-left lg:text-[11px]')}>
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

      <div className="bg-brand-gradient hidden shrink-0 rounded-tr-[2rem] p-2 pt-3 lg:block">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={wide}
          title={wide ? t('nav.collapse') : t('nav.expand')}
          className={cn(
            'press flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white hover:bg-white/15',
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
        'press flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center',
        wide && 'lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:py-2 lg:text-left short:lg:min-h-10',
        active ? 'bg-brand bg-brand-gradient text-white shadow-brand' : 'text-slate-800 hover:bg-brand-soft hover:text-brand',
      )}
    >
      <SectionIcon sectionKey={section.key} className="size-5 shrink-0" />
      <span className={cn('text-[10px] font-bold leading-tight', wide && 'lg:flex-1 lg:text-[15px]')}>{label}</span>
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
        'press flex min-h-10 items-center justify-center gap-3 rounded-lg px-2 text-sm',
        wide && 'lg:justify-start lg:px-3',
        active ? 'bg-brand-soft text-brand' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800',
      )}
    >
      <SectionIcon sectionKey={section.key} className="size-4 shrink-0" />
      <span className={cn('hidden flex-1 truncate', wide && 'lg:block')}>{label}</span>
      <span className={cn('hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500', wide && 'lg:block')}>
        {t('nav.phaseShort', { phase: section.phase })}
      </span>
    </Link>
  );
}
