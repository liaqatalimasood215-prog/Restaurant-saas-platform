'use client';

import { useSyncExternalStore } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { t } from '@/i18n';
import { deviceStore } from '@/lib/device-store';
import { useInstallApp, useOnline } from '@/lib/pwa';
import { useStore } from './store-context';

/** Only says that the connection dropped; the website itself needs internet (no offline mode before Phase 11). */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" data-offline-banner className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-stone-900 px-4 py-2 text-center text-sm font-semibold text-white">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      {t('pwa.offline')}
    </p>
  );
}

const dismissed = deviceStore<boolean>('lala-store-install-later', false);

/** The install offer on Home; "Not now" is remembered on this device. */
export function InstallBanner() {
  const { store } = useStore();
  const slug = store.restaurant.slug;
  const install = useInstallApp();
  const later = useSyncExternalStore(dismissed.subscribe, () => dismissed.load(slug), () => false);
  if (!install.canOffer || later) return null;
  return (
    <section data-install-banner className="flex flex-wrap items-center gap-3 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-stone-900">
        <Download className="size-5" aria-hidden />
      </span>
      <div className="min-w-44 flex-1">
        <h2 className="font-extrabold">{t('pwa.installTitle')}</h2>
        <p className="text-sm text-stone-600">{install.canPrompt ? t('pwa.installBody', { name: store.brand.wordmark ?? store.restaurant.name }) : t('pwa.iosHint')}</p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" onClick={() => dismissed.save(slug, true)}>
          {t('pwa.later')}
        </Button>
        {install.canPrompt && <Button onClick={() => void install.install()}>{t('pwa.install')}</Button>}
      </div>
    </section>
  );
}
