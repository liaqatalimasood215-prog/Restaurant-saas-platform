'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MonitorOff } from 'lucide-react';
import { t } from '@/i18n';

const CHECK_EVERY_MS = 5000;

/**
 * The Customer and Rider Apps are separate apps: when one is not running, its frame would stay blank with no reason given. This
 * asks the app every few seconds, says so when it does not answer, and brings the frame back by itself when it does.
 */
export function AppPreviewFrame({ origin, appName, children }: { origin: string; appName: string; children: ReactNode }) {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let stopped = false;
    let misses = 0;
    const check = async () => {
      try {
        // Only "did it answer" matters, so the app's reply stays unread.
        await fetch(origin, { mode: 'no-cors', cache: 'no-store' });
        misses = 0;
        if (!stopped) setDown(false);
      } catch {
        // One lost answer must not reload a preview someone is using.
        misses += 1;
        if (!stopped && misses >= 2) setDown(true);
      }
    };
    void check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [origin]);

  if (!down) return <>{children}</>;
  return (
    <div role="alert" data-app-not-running className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 p-4 text-center">
      <MonitorOff className="size-8 text-slate-400" aria-hidden />
      <p className="font-bold text-slate-900">{t('appPreview.notRunning', { app: appName })}</p>
      <p className="text-sm text-slate-600">{t('appPreview.notRunningHint')}</p>
    </div>
  );
}
