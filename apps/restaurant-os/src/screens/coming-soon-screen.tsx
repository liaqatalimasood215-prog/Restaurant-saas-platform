import type { OsSection } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { SectionIcon } from '@/components/shell/section-icon';
import { Card, CardBody } from '@/components/ui/card';
import { t, tList } from '@/i18n';

/** A later-phase module: "Coming Soon" PLACEHOLDER without function (MASTER_PROMPT.md §7.1). */
export function ComingSoonScreen({ section }: { section: OsSection }) {
  return (
    <>
      <ScreenHeader title={t(`nav.${section.key}`)} status="PLACEHOLDER" description={t('comingSoon.body')} />
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <SectionIcon sectionKey={section.key} className="size-8" />
          </div>
          <p className="text-lg font-bold text-slate-900">{t('comingSoon.title', { phase: section.phase })}</p>
          <p className="text-sm font-semibold text-slate-700">{t('comingSoon.plannedContent')}</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {tList(`sectionPlans.${section.key}`).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
