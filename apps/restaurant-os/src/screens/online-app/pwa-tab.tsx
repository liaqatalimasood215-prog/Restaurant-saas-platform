import { Smartphone } from 'lucide-react';
import type { OnlineAppView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { t } from '@/i18n';
import { Heading, PwaChecks } from './online-parts';

export function PwaTab({ view }: { view: OnlineAppView }) {
  return (
    <Card className="max-w-3xl">
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Heading icon={Smartphone} title={t('onlineApp.pwaCard.title')} />
          <Badge tone="amber">{t(`onlineApp.pwaState.${view.publishing.pwaState}`)}</Badge>
        </div>
        <p className="text-sm text-slate-700">{t('onlineApp.pwaCard.body')}</p>
        <h3 className="text-sm font-bold text-slate-900">{t('onlineApp.pwaTab.title')}</h3>
        <PwaChecks />
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('onlineApp.pwaTab.note')}</p>
      </CardBody>
    </Card>
  );
}
