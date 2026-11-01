'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, FlaskConical } from 'lucide-react';
import { t } from '@/i18n';
import { getDemoControls } from '@/lib/api';
import { Avatar } from './ui';

/** Every prototype screen shows this (PROJECT_RULES.md §16); a tap says what is not real. */
export function DemoBadge({ onExplain }: { onExplain: () => void }) {
  return (
    <button
      type="button"
      onClick={onExplain}
      aria-label={t('demo.open')}
      data-demo-source={getDemoControls().source()}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-800"
    >
      <FlaskConical className="size-3.5" aria-hidden />
      {t('demo.label')}
    </button>
  );
}

/** The top of every other page: back arrow, title, DEMO. */
export function ScreenTop({ title, backHref, backLabel, onExplain }: { title: ReactNode; backHref: string; backLabel?: string; onExplain: () => void }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
      <Link href={backHref} aria-label={backLabel ?? t('app.back')} data-back className="-ml-2 grid size-11 place-items-center rounded-full text-ink hover:bg-page">
        <ArrowLeft className="size-6" aria-hidden />
      </Link>
      <h1 className="min-w-0 text-center text-xl font-black leading-tight tracking-tight">{title}</h1>
      <DemoBadge onExplain={onExplain} />
    </div>
  );
}

/** The top of Home: who is riding, new-order bell, and the Online switch. */
export function RiderHeader({
  name,
  restaurantName,
  branchName,
  newCount,
  onBell,
  onExplain,
  availability,
}: {
  name: string;
  restaurantName: string;
  branchName: string;
  newCount: number;
  onBell: () => void;
  onExplain: () => void;
  availability: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1 pt-1">
        <p className="truncate text-lg font-extrabold leading-tight" data-rider-name>{name}</p>
        <p className="text-xs text-muted">{t('home.role', { branch: branchName })}</p>
        <p className="sr-only" data-restaurant-name>{restaurantName}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <DemoBadge onExplain={onExplain} />
          <button type="button" onClick={onBell} aria-label={t('home.bell', { n: newCount })} className="relative grid size-11 place-items-center rounded-full text-ink hover:bg-page">
            <Bell className="size-6" aria-hidden />
            {newCount > 0 && (
              <span data-new-count={newCount} className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.625rem] font-black leading-4 text-white">
                {newCount}
              </span>
            )}
          </button>
        </div>
        {availability}
      </div>
    </header>
  );
}
