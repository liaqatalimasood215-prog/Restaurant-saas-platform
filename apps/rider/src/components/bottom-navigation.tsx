'use client';

import Link from 'next/link';
import { ChartNoAxesColumn, House, Package, UserRound } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** Home, Orders, Earnings, Profile. An order opened from Home keeps Home lit. */
export function BottomNavigation({ base, pathname }: { base: string; pathname: string }) {
  const tabs = [
    { href: base, label: t('nav.home'), icon: House, active: pathname === base },
    { href: `${base}/orders`, label: t('nav.orders'), icon: Package, active: pathname === `${base}/orders` },
    { href: `${base}/today`, label: t('nav.earnings'), icon: ChartNoAxesColumn, active: pathname === `${base}/today` || pathname === `${base}/history` },
    { href: `${base}/account`, label: t('nav.profile'), icon: UserRound, active: pathname === `${base}/account` },
  ];
  return (
    <nav aria-label={t('nav.label')} data-bottom-nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            className={cn('flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand', tab.active ? 'text-brand' : 'text-muted')}
          >
            <tab.icon className="size-6" aria-hidden />
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
