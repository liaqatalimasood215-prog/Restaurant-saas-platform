import { Bike } from 'lucide-react';
import { FeatureStatusBadge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { t } from '@/i18n';

/** Riders cannot use Restaurant OS (PROJECT_RULES.md §7). */
export function RiderNotice() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
        <Bike className="size-12 text-brand" aria-hidden />
        <h1 className="text-xl font-extrabold text-slate-900">{t('rider.title')}</h1>
        <FeatureStatusBadge status="PLACEHOLDER" />
        <p className="max-w-md text-sm text-slate-600">{t('rider.body')}</p>
        <p className="text-sm font-semibold text-slate-800">{t('rider.hint')}</p>
      </CardBody>
    </Card>
  );
}
