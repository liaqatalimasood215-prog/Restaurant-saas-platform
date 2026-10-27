'use client';

import { useState } from 'react';
import { Bike, ExternalLink, Smartphone } from 'lucide-react';
import type { OsSection } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge, FeatureStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { t, tList } from '@/i18n';

/**
 * Online App and Riders pages: a management area plus a preview of the separate real app with an
 * "Open Full App" button (owner decision 2026-10-27). The apps are built in Phases 2 and 3, so the
 * preview and the button are PLACEHOLDERS for now; the management controls arrive in Preview 5.
 */
export function AppPreviewScreen({ section, app }: { section: OsSection; app: 'customer' | 'rider' }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const AppIcon = app === 'customer' ? Smartphone : Bike;

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

        <Card>
          <CardHeader>
            <CardTitle>
              {t('appPreview.preview')} · {t(`appPreview.${app}.appName`)}
            </CardTitle>
            <FeatureStatusBadge status="PLACEHOLDER" />
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-4">
            <div className="flex aspect-[9/16] w-full max-w-56 flex-col items-center justify-center gap-3 rounded-[2rem] border-4 border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <AppIcon className="size-10 text-slate-400" aria-hidden />
              <p className="text-sm font-bold text-slate-800">{t(`appPreview.${app}.phaseLabel`)}</p>
              <FeatureStatusBadge status="PLACEHOLDER" />
              <p className="text-xs text-slate-500">{t(`appPreview.${app}.previewBody`)}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setDialogOpen(true)}>
              <ExternalLink className="size-5" aria-hidden />
              {t('appPreview.openFullApp')}
              <Badge tone="dark">{t('status.PLACEHOLDER')}</Badge>
            </Button>
          </CardBody>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t(`appPreview.${app}.dialogTitle`)}
        footer={<Button onClick={() => setDialogOpen(false)}>{t('appPreview.dialogClose')}</Button>}
      >
        <p className="mb-3">
          <FeatureStatusBadge status="PLACEHOLDER" />
        </p>
        {t(`appPreview.${app}.dialogBody`)}
      </Dialog>
    </>
  );
}
