'use client';

import { useState } from 'react';
import { Globe, LayoutDashboard, Play, Settings, Smartphone, type LucideIcon } from 'lucide-react';
import { ScreenHeader } from '@/components/screen-header';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { AndroidTab } from './android-tab';
import { OverviewTab } from './overview-tab';
import { PwaTab } from './pwa-tab';
import { SettingsTab } from './settings-tab';
import { useWebsiteBridge } from './website-bridge';
import { WebsiteTab } from './website-tab';

export type OnlineTab = 'overview' | 'website' | 'pwa' | 'android' | 'settings';

const TABS: { key: OnlineTab; icon: LucideIcon }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'website', icon: Globe },
  { key: 'pwa', icon: Smartphone },
  { key: 'android', icon: Play },
  { key: 'settings', icon: Settings },
];

/**
 * Online App / Website (owner's brief, 2026-10-30): the control panel for the restaurant's customer website and
 * mobile app. The owner stays in Restaurant OS; only View Website opens the customer app. Website and Android are
 * two separate publishing flows on one business system. Everything here is DEMO: nothing is really published.
 */
export function OnlineAppScreen() {
  const { allowed } = useSession();
  const online = useApiQuery(() => getApi().getOnlineApp(), []);
  useWebsiteBridge();
  const toast = useToast();
  const [tab, setTab] = useState<OnlineTab>('overview');
  const [busy, setBusy] = useState(false);
  const canManage = allowed('menu.manage');
  const canPublish = allowed('onlineApp.publish');
  const header = <ScreenHeader title={t('onlineApp.title')} status="DEMO_PROTOTYPE" description={t('onlineApp.description')} />;
  if (online.loading && !online.data) return (<>{header}<LoadingState /></>);
  if (!online.data) return (<>{header}<ErrorState message={online.error?.message} onRetry={online.reload} /></>);
  const view = online.data;

  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) toast.show({ tone: 'success', title: done });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    } finally {
      setBusy(false);
    }
  };
  const shared = { view, canManage, canPublish, busy, run };

  return (
    <>
      {header}
      {!canManage && <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{t('onlineApp.readOnly')}</p>}
      <div role="tablist" aria-label={t('onlineApp.tabs.label')} className="mb-4 flex overflow-x-auto rounded-2xl border border-slate-200 bg-white px-1 shadow-sm">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex min-h-14 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors',
              tab === key ? 'border-brand text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900',
            )}
          >
            <Icon className={cn('size-5', tab === key && 'text-brand')} aria-hidden />
            {t(`onlineApp.tabs.${key}`)}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab {...shared} onOpenTab={setTab} />}
      {tab === 'website' && <WebsiteTab {...shared} />}
      {tab === 'pwa' && <PwaTab view={view} />}
      {tab === 'android' && <AndroidTab view={view} />}
      {tab === 'settings' && <SettingsTab {...shared} />}
    </>
  );
}
