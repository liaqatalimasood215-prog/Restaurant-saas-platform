import type { ReactNode } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { t } from '@/i18n';
import { Button } from './button';

/** Every screen has loading, empty and error states (MASTER_PROMPT.md §11). */
export function LoadingState({ label = t('states.loading') }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500">
      <LoaderCircle className="size-8 animate-spin text-brand" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
    >
      <TriangleAlert className="size-8 text-red-600" aria-hidden />
      <p className="text-base font-bold text-red-800">{t('states.errorTitle')}</p>
      <p className="max-w-md text-sm text-red-700">{message ?? t('states.errorBody')}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t('states.retry')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      {icon}
      <p className="text-base font-bold text-slate-800">{title}</p>
      {children && <div className="max-w-md text-sm text-slate-600">{children}</div>}
    </div>
  );
}
