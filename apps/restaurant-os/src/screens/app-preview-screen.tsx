'use client';

import { useState } from 'react';
import { Bike, ExternalLink } from 'lucide-react';
import type { OsSection } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge, FeatureStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { t, tList } from '@/i18n';

/**
 * Riders page: a management area plus a preview of the separate Rider App with an "Open Full App" button
 * (owner decision 2026-10-27). The app is built in Phase 3, so the preview and the button are PLACEHOLDERS
 * for now; the management controls arrive in Preview 5.
 */
export function AppPreviewScreen({ section }: { section: OsSection }) {
  return (
    <>
      <ScreenHeader
        title={t(`nav.${section.key}`)}
        status="PLACEHOLDER"
        description={t('upcoming.body', { n: 5 })}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card>
          <CardHeader>
            <CardTitle>{t('appPreview.management')}</CardTitle>
            <FeatureStatusBadge status="PLACEHOLDER" />
          </CardHeader>
          <CardBody>
            <p className="text-sm font-semibold text-slate-700">{t('appPreview.managementPlaceholder')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {tList(`sectionPlans.${section.key}`).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <AppPreviewCard />
      </div>
    </>
  );
}

/** The phone-shaped preview of the Rider App and its "Open Full App" button: PLACEHOLDERS until the app exists. */
function AppPreviewCard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
        <Card>
          <CardHeader>
            <CardTitle>
              {t('appPreview.preview')} · {t('appPreview.rider.appName')}
            </CardTitle>
            <FeatureStatusBadge status="PLACEHOLDER" />
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-4">
            <div className="flex aspect-[9/16] w-full max-w-56 flex-col items-center justify-center gap-3 rounded-[2rem] border-4 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <Bike className="size-10 text-slate-400" aria-hidden />
              <p className="text-sm font-bold text-slate-800">{t('appPreview.rider.phaseLabel')}</p>
              <FeatureStatusBadge status="PLACEHOLDER" />
              <p className="text-xs text-slate-500">{t('appPreview.rider.previewBody')}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
              <ExternalLink className="size-5" aria-hidden />
              {t('appPreview.openFullApp')}
              <Badge tone="dark">{t('status.PLACEHOLDER')}</Badge>
            </Button>
          </CardBody>
        </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t('appPreview.rider.dialogTitle')}
        footer={<Button onClick={() => setDialogOpen(false)}>{t('appPreview.dialogClose')}</Button>}
      >
        <p className="mb-3">
          <FeatureStatusBadge status="PLACEHOLDER" />
        </p>
        {t('appPreview.rider.dialogBody')}
      </Dialog>
    </>
  );
}
