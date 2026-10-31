'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Copy, ExternalLink, Eye, Globe, Link2, Play, Smartphone } from 'lucide-react';
import { onlineStatus, type OnlineStatus } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { OnlineTab } from './online-app-screen';
import type { WebsiteSection } from './website-tab';
import { AndroidSteps, CheckList, CheckRow, Heading, PublishWebsiteButton, PwaChecks, customerUrl, linkButtonClass, type OnlineTabProps } from './online-parts';
import { LivePreview, PhonePreview, type PreviewDevice } from './website-previews';

const STATUS_LOOK: Record<OnlineStatus, { dot: string; box: string }> = {
  DRAFT: { dot: 'bg-amber-500', box: 'border-amber-200 bg-amber-50/60' },
  PUBLISHING: { dot: 'bg-blue-500', box: 'border-blue-200 bg-blue-50/60' },
  LIVE: { dot: 'bg-green-500', box: 'border-green-200 bg-green-50/60' },
  CHANGES_PENDING: { dot: 'bg-amber-500', box: 'border-amber-200 bg-amber-50/60' },
  FAILED: { dot: 'bg-red-500', box: 'border-red-200 bg-red-50/60' },
  DOMAIN_REQUIRED: { dot: 'bg-amber-500', box: 'border-amber-200 bg-amber-50/60' },
  OFFLINE: { dot: 'bg-red-500', box: 'border-red-200 bg-red-50/60' },
  SUBSCRIPTION_SUSPENDED: { dot: 'bg-red-500', box: 'border-red-200 bg-red-50/60' },
};

export function OverviewTab({ onOpenTab, ...props }: OnlineTabProps & { onOpenTab: (tab: OnlineTab, part?: WebsiteSection) => void }) {
  const { view, canPublish, busy, run } = props;
  const [device, setDevice] = useState<PreviewDevice>(() => (window.matchMedia('(max-width: 639px)').matches ? 'mobile' : 'desktop'));
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewPath, setPreviewPath] = useState(view.customerPath);
  const showPreview = (next: PreviewDevice) => {
    setDevice(next);
    previewRef.current?.scrollIntoView({ block: 'start' });
  };
  const publish = () => void run(() => getApi().publishWebsite(), t('onlineApp.publishDone'));
  const publishButton = (className?: string) => <PublishWebsiteButton view={view} canPublish={canPublish} busy={busy} onPublish={publish} className={className} />;
  const live = view.publishing.websiteState === 'LIVE' || view.publishing.websiteState === 'CHANGES_PENDING';
  const domainConnected = view.publishing.domainState === 'CONNECTED';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:[grid-template-areas:'top_top'_'live_phone'] min-[1400px]:[grid-template-areas:'top_phone'_'live_phone']">
      <div className="min-w-0 space-y-4 lg:[grid-area:top]">
        <StatusHeader {...props} publishButton={publishButton()} />
        <div className="grid gap-4 lg:grid-cols-3">
          <SetupCard icon={Globe} title={t('onlineApp.websiteCard.title')} body={t('onlineApp.websiteCard.body')} badge={<Badge tone={live ? 'green' : 'amber'}>{t(`onlineApp.websiteState.${view.publishing.websiteState}`)}</Badge>}>
            <div>
              <p className="mb-1 text-sm font-bold text-slate-900">{t('onlineApp.websiteCard.domain')}</p>
              <p className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500" data-domain>
                {view.publishing.customDomain ?? t('onlineApp.websiteCard.noDomain')}
              </p>
            </div>
            <CheckList>
              <CheckRow done={domainConnected} label={t('onlineApp.websiteCard.domainConnected')} note={domainConnected ? t('onlineApp.demo') : view.publishing.domainState === 'DNS_PENDING' ? t('onlineApp.domainPending') : t('onlineApp.planned')} />
              <CheckRow done={domainConnected} label={t('onlineApp.websiteCard.https')} note={domainConnected ? t('onlineApp.demo') : t('onlineApp.planned')} />
              <CheckRow done={live} label={t('onlineApp.websiteCard.published')} note={live ? t('onlineApp.demo') : t('onlineApp.notYet')} />
            </CheckList>
            <div className="mt-auto space-y-2">
              <Button variant="secondary" className="w-full" onClick={() => onOpenTab('website', 'domain')}>
                {view.publishing.domainState === 'NONE' ? t('onlineApp.connectDomain') : t('onlineApp.editDomain')}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => showPreview('desktop')}>
                <Eye className="size-4" aria-hidden />
                {t('onlineApp.previewWebsite')}
              </Button>
              {publishButton('w-full')}
            </div>
          </SetupCard>

          <SetupCard icon={Smartphone} title={t('onlineApp.pwaCard.title')} body={t('onlineApp.pwaCard.body')} badge={<Badge tone="amber">{t(`onlineApp.pwaState.${view.publishing.pwaState}`)}</Badge>}>
            <PwaChecks />
            <Button variant="outline" className="mt-auto w-full" onClick={() => showPreview('mobile')}>
              <Eye className="size-4" aria-hidden />
              {t('onlineApp.previewMobile')}
            </Button>
          </SetupCard>

          <SetupCard icon={Play} title={t('onlineApp.androidCard.title')} body={t('onlineApp.androidCard.body')} badge={<Badge tone="grey">{t(`onlineApp.androidState.${view.publishing.androidState}`)}</Badge>}>
            <AndroidSteps />
            <Button variant="outline" className="mt-auto w-full" onClick={() => onOpenTab('android')}>
              {t('onlineApp.publishOnlineApp')}
            </Button>
          </SetupCard>
        </div>
      </div>
      <div ref={previewRef} className="min-w-0 scroll-mt-20 lg:[grid-area:live]">
        <LivePreview view={view} path={previewPath} onPath={setPreviewPath} device={device} onDevice={setDevice} />
      </div>
      <div className="hidden self-start lg:block lg:[grid-area:phone]">
        <PhonePreview path={previewPath} />
      </div>
    </div>
  );
}

function StatusHeader({ view, canManage, canPublish, busy, run, publishButton }: OnlineTabProps & { publishButton: ReactNode }) {
  const toast = useToast();
  const url = customerUrl(view.customerPath);
  const status = onlineStatus(view.publishing, view.onlineOrdersEnabled);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ tone: 'success', title: t('onlineApp.copied') });
    } catch {
      toast.show({ tone: 'error', title: t('onlineApp.copyFailed') });
    }
  };
  return (
    <Card className={cn('border', STATUS_LOOK[status].box)}>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-60 flex-1 items-start gap-3">
            <span className={cn('mt-1.5 size-3.5 shrink-0 rounded-full', STATUS_LOOK[status].dot)} aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900" data-online-status={status}>
                {t(`onlineApp.status.${status}.title`)}
              </h2>
              <p className="text-sm text-slate-600">{t(`onlineApp.status.${status}.body`)}</p>
            </div>
          </div>
          <div className="flex min-h-12 min-w-0 max-w-full items-center rounded-xl border border-slate-200 bg-white pl-3">
            <Link2 className="size-4 shrink-0 text-slate-400" aria-hidden />
            <span className="min-w-0 truncate px-2 text-sm font-semibold text-slate-700" data-customer-url>{url}</span>
            <span className="hidden min-[1400px]:block">
              <Badge tone="amber">{t('onlineApp.linkStatus')}</Badge>
            </span>
            <button type="button" onClick={() => void copy()} aria-label={t('onlineApp.copy')} className="grid size-12 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100">
              <Copy className="size-4" aria-hidden />
            </button>
          </div>
          {/* rel="opener": the website tab asks this page for its menu (website-bridge.ts). */}
          <a href={url} target="_blank" rel="opener" className={linkButtonClass}>
            <ExternalLink className="size-4" aria-hidden />
            {t('onlineApp.viewWebsite')}
          </a>
          {publishButton}
        </div>
        {!canPublish && <p className="text-xs font-semibold text-slate-600">{t('onlineApp.publishOwnerOnly')}</p>}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-900/10 pt-3">
          <div className="min-w-48 flex-1">
            <p className="font-bold text-slate-900" data-online-state>
              {view.onlineOrdersEnabled ? t('onlineApp.ordersOn') : t('onlineApp.ordersOff')}
            </p>
            <p className="text-xs text-slate-600">{t('onlineApp.ordersHint')}</p>
          </div>
          <Switch
            compact
            checked={view.onlineOrdersEnabled}
            disabled={!canManage || busy}
            onChange={(on) => void run(() => getApi().setOnlineOrdersEnabled(on), on ? t('onlineApp.nowOn') : t('onlineApp.nowOff'))}
            label={t('onlineApp.ordersTitle')}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function SetupCard({ icon, title, body, badge, children }: { icon: typeof Globe; title: string; body: string; badge: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col gap-3">
        <Heading icon={icon} title={title} />
        <div>{badge}</div>
        <p className="text-sm text-slate-600">{body}</p>
        {children}
      </CardBody>
    </Card>
  );
}
