import { Construction } from 'lucide-react';
import type { OsSection } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { SectionIcon } from '@/components/shell/section-icon';
import { Card, CardBody } from '@/components/ui/card';
import { t, tList } from '@/i18n';

/** A Phase 1 screen that a later preview of Phase 1 builds. */
export function UpcomingScreen({ section, preview }: { section: OsSection; preview: number }) {
  return (
    <>
      <ScreenHeader
        title={t(`nav.${section.key}`)}
        status="PLACEHOLDER"
        description={t('upcoming.body', { n: preview })}
      />
      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <SectionIcon sectionKey={section.key} className="size-8" />
          </div>
          <div>
            <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Construction className="size-5 text-amber-600" aria-hidden />
              {t('upcoming.title', { n: preview })}
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-700">{t('upcoming.willInclude')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {tList(`sectionPlans.${section.key}`).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
