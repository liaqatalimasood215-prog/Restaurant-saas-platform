'use client';

import type { ReactNode } from 'react';
import { canUseApp } from '@restaurant-saas/shared';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { RiderNotice } from '@/screens/rider-notice';
import { useSession } from '@/lib/session';
import { BottomNav } from './bottom-nav';
import { DemoStrip } from './demo-strip';
import { Header } from './header';
import { Sidebar } from './sidebar';

/**
 * Restaurant OS layout: sidebar on the left (tablet/desktop), header on top, and the main workspace
 * that shows only the selected feature. Phones get a bottom navigation bar instead of the sidebar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, error, loading, reload } = useSession();

  let content: ReactNode;
  if (loading && !session) content = <LoadingState />;
  else if (!session) content = <ErrorState message={error?.message} onRetry={reload} />;
  else if (!canUseApp(session.user.role, 'restaurant-os')) content = <RiderNotice />;
  else content = children;

  return (
    <div className="flex min-h-dvh bg-surface text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoStrip />
        <Header />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-8">
          {content}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
