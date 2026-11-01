'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { ToastProvider } from '@/components/ui/toast';
import { useSession } from '@/lib/session';
import { registerServiceWorker } from '@/lib/pwa';
import { LoginScreen } from '@/screens/login-screen';
import { useRiderBridge } from '@/screens/riders/rider-bridge';
import { BottomNav } from './bottom-nav';
import { Header } from './header';
import { NotificationsProvider } from './notifications';
import { Sidebar } from './sidebar';

/**
 * Restaurant OS layout: sidebar on the left (tablet/desktop), header on top, and the main workspace
 * that shows only the selected feature. Phones get a bottom navigation bar instead of the sidebar.
 * Logged out: the DEMO login screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: session, error, reload } = useSession();
  const pathname = usePathname();

  useEffect(() => registerServiceWorker(), []);
  useRiderBridge();

  // The activation page is opened from the Owner's link before the person can log in.
  if (pathname === '/activate') return <ToastProvider>{children}</ToastProvider>;

  if (session === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-4">
        {error ? <ErrorState message={error.message} onRetry={reload} /> : <LoadingState />}
      </div>
    );
  }
  if (session === null) return <LoginScreen />;

  return (
    <ToastProvider>
      <NotificationsProvider>
        <div className="flex min-h-dvh bg-surface text-slate-900">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main id="main" className="mx-auto w-full max-w-[96rem] flex-1 px-4 pb-28 pt-4 md:px-5 md:pb-6 short:pt-3 md:short:pb-3">
              {children}
            </main>
          </div>
          <BottomNav />
        </div>
      </NotificationsProvider>
    </ToastProvider>
  );
}
