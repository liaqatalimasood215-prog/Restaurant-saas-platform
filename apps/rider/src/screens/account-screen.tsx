'use client';

import { useRouter } from 'next/navigation';
import { Download, LogOut, RotateCcw } from 'lucide-react';
import { Avatar, Button, Card } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { useInstallApp } from '@/lib/pwa';
import { useRider } from './rider-context';

export function AccountScreen() {
  const { base, me, branch, notify } = useRider();
  const router = useRouter();
  const installer = useInstallApp();
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3 py-2">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-right text-sm font-bold">{value}</dd>
    </div>
  );
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-black tracking-tight">{t('account.title')}</h1>
      <Card className="flex items-center gap-3">
        <Avatar name={me.name} className="size-14" />
        <p className="text-lg font-extrabold">{me.name}</p>
      </Card>
      <Card>
        <dl className="divide-y divide-stone-100">
          {row(t('account.phone'), me.phone)}
          {row(t('account.restaurant'), branch.restaurantName)}
          {row(t('account.branch'), branch.branchName)}
        </dl>
      </Card>
      {installer.canOffer && (
        <Card className="space-y-2">
          {installer.canPrompt ? (
            <Button variant="secondary" className="w-full" onClick={() => void installer.install()}>
              <Download className="size-5" aria-hidden />
              {t('account.install')}
            </Button>
          ) : (
            <p className="text-sm text-stone-700">{t('account.installIos')}</p>
          )}
        </Card>
      )}
      <p className="px-1 text-xs text-stone-500">{t('account.installNote')}</p>
      {getDemoControls().source() === 'SAMPLE' && (
        <Button
          variant="demo"
          className="w-full"
          onClick={() => {
            getDemoControls().resetSample();
            notify(t('demo.resetDone'));
          }}
        >
          <RotateCcw className="size-5" aria-hidden />
          {t('demo.reset')}
        </Button>
      )}
      {/* The next login starts on the deliveries, not on this page. */}
      <Button variant="secondary" className="w-full" onClick={() => void getApi().logout().then(() => router.replace(base))}>
        <LogOut className="size-5" aria-hidden />
        {t('account.logout')}
      </Button>
    </div>
  );
}
