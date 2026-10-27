import { t } from '@/i18n';

/** Always-visible DEMO / PROTOTYPE notice (PROJECT_RULES.md §16). */
export function DemoStrip() {
  return (
    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 md:px-6">
      <span className="shrink-0 rounded bg-brand px-1.5 py-0.5 font-black tracking-wide text-white">
        {t('status.DEMO_PROTOTYPE')}
      </span>
      <span className="truncate">{t('demo.strip')}</span>
      <span className="ml-auto hidden shrink-0 font-semibold text-slate-300 sm:inline">{t('demo.sync')}</span>
    </div>
  );
}
