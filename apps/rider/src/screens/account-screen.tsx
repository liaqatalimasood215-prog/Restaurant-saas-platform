'use client';

import { useRouter } from 'next/navigation';
import { Download, LogOut, RotateCcw } from 'lucide-react';
import { ScreenTop } from '@/components/rider-header';
import { Avatar, Button, Card } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { useInstallApp } from '@/lib/pwa';
import { useRider } from './rider-context';

/** Profile: read only. The restaurant Owner changes a rider's details in Restaurant OS. */
export function AccountScreen() {
  const { base, me, branch, notify, explainDemo } = useRider();
  const router = useRouter();
  const installer = useInstallApp();
  const row = (label: string, value: string, key?: string) => (
    <div className="flex justify-between gap-3 py-2" data-profile={key}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-bold">{value}</dd>
    </div>
  );
  return (
    <div className="space-y-3">
      <ScreenTop title={t('account.title')} backHref={base} onExplain={explainDemo} />
      <Card className="flex items-center gap-3">
        <Avatar name={me.name} className="size-14" />
        <div className="min-w-0">
          <p className="text-lg font-extrabold">{me.name}</p>
          <p className="text-sm text-muted">{t('account.role')}</p>
        </div>
      </Card>
      <Card className="py-2">
        <dl className="divide-y divide-line">
          {row(t('account.phone'), me.phone)}
          {row(t('account.restaurant'), branch.restaurantName)}
          {row(t('account.branch'), branch.branchName)}
          {row(t('account.availability'), t(me.riderOnline ? 'availability.online' : 'availability.offline'), 'availability')}
          {row(t('account.version'), t('account.versionValue'), 'version')}
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
            <p className="text-sm text-ink">{t('account.installIos')}</p>
          )}
        </Card>
      )}
      <p className="px-1 text-xs text-muted">{t('account.installNote')}</p>
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
