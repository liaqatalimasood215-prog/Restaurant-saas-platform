import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

function Bone({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-2xl bg-stone-200/70 motion-reduce:animate-none', className)} />;
}

function Status({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div role="status" className={className} data-skeleton>
      <span className="sr-only">{t('app.loading')}</span>
      {children}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Status className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Bone key={i} className="h-24 w-full rounded-3xl" />
      ))}
    </Status>
  );
}

/** The first look while the restaurant's data loads: the shape of the Home screen. */
export function StoreSkeleton() {
  return (
    <Status className="mx-auto w-full max-w-6xl space-y-5 px-4 py-4">
      <Bone className="h-10 w-32" />
      <Bone className="h-12 w-full" />
      <Bone className="h-12 w-full" />
      <span className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="size-16 shrink-0 rounded-full" />
        ))}
      </span>
      <Bone className="h-44 w-full rounded-3xl" />
      <span className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="aspect-[4/3] w-full rounded-3xl" />
        ))}
      </span>
    </Status>
  );
}
