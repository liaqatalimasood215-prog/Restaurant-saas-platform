'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'demo' }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark',
        variant === 'success' && 'bg-green-700 text-white hover:bg-green-800',
        variant === 'secondary' && 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
        variant === 'ghost' && 'text-stone-600 hover:bg-stone-100',
        variant === 'demo' && 'border-2 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100',
        className,
      )}
      {...rest}
    />
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-3xl bg-white p-4 shadow-sm', className)} {...rest}>
      {children}
    </div>
  );
}

/** A sheet from the bottom on phones, a centred box on large screens. */
export function Sheet({ title, onClose, footer, children }: { title: string; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mb-0 mt-auto max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white p-0 text-stone-900 open:flex sm:my-auto sm:rounded-3xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t('app.close')} className="-mr-2 grid size-11 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">{children}</div>
      {footer && <div className="shrink-0 space-y-2 border-t border-stone-100 p-4">{footer}</div>}
    </dialog>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div data-empty-state className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
      {icon}
      <p className="text-lg font-extrabold">{title}</p>
      {children && <p className="max-w-xs text-sm text-stone-600">{children}</p>}
    </div>
  );
}

export function Problem({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <main role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
      <TriangleAlert className="size-10 text-amber-600" aria-hidden />
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="text-sm text-stone-600">{body ?? t('app.errorBody')}</p>
      {onRetry && <Button onClick={onRetry}>{t('app.retry')}</Button>}
    </main>
  );
}

export function Skeleton() {
  return (
    <main aria-busy="true" aria-label={t('app.loading')} className="mx-auto max-w-lg space-y-3 p-4">
      <div className="h-14 animate-pulse rounded-2xl bg-stone-200" />
      <div className="h-20 animate-pulse rounded-3xl bg-stone-200" />
      <div className="h-36 animate-pulse rounded-3xl bg-stone-200" />
      <div className="h-36 animate-pulse rounded-3xl bg-stone-200" />
    </main>
  );
}

/** Initials on the brand colour. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span aria-hidden className={cn('grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-black text-brand', className)}>
      {initials}
    </span>
  );
}
