import { Play } from 'lucide-react';
import type { OnlineAppView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { t } from '@/i18n';
import { AndroidSteps, Heading } from './online-parts';

/** The future Android flow, separate from Publish Website. Screens only: no build tools, keys or Google Play here. */
export function AndroidTab({ view }: { view: OnlineAppView }) {
  return (
    <Card className="max-w-3xl">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Heading icon={Play} title={t('onlineApp.androidCard.title')} />
          <Badge tone="grey">{t(`onlineApp.androidState.${view.publishing.androidState}`)}</Badge>
        </div>
        <p className="text-sm text-slate-700">{t('onlineApp.androidCard.body')}</p>
        <AndroidSteps detailed />
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800" data-android-note>{t('onlineApp.androidCard.demoNote')}</p>
      </CardBody>
    </Card>
  );
}
