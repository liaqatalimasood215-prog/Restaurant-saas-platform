'use client';

import { useEffect, useRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, TriangleAlert, X } from 'lucide-react';
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
        variant === 'success' && 'bg-success text-white hover:brightness-90',
        variant === 'secondary' && 'border border-line bg-card text-ink hover:bg-page',
        variant === 'ghost' && 'text-muted hover:bg-page',
        variant === 'demo' && 'border-2 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100',
        className,
      )}
      {...rest}
    />
  );
}

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-line bg-card p-4 shadow-sm', className)} {...rest}>
      {children}
    </div>
  );
}

const ACTION_BAR = 'fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]';
const ACTION = 'relative flex min-h-14 w-full items-center justify-center rounded-full bg-brand px-14 text-center text-lg font-extrabold leading-tight text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';

function ActionIcon({ icon }: { icon: ReactNode }) {
  return (
    <span aria-hidden className="absolute left-1.5 grid size-11 place-items-center rounded-full bg-card text-brand">
      {icon}
    </span>
  );
}

/** The one big next step, at the bottom where the thumb reaches. */
export function PrimaryAction({ icon, children, hint, ...rest }: { icon: ReactNode; hint?: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <div className={ACTION_BAR}>
      <div className="mx-auto max-w-lg space-y-2">
        {hint && (
          <p role="status" data-action-hint className="text-center text-sm font-semibold text-brand">
            {hint}
          </p>
        )}
        <button type="button" className={ACTION} {...rest}>
          <ActionIcon icon={icon} />
          {children}
        </button>
      </div>
    </div>
  );
}

/** The same big button when it opens another app. */
export function PrimaryLink({ icon, children, ...rest }: { icon: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <div className={ACTION_BAR}>
      <div className="mx-auto max-w-lg">
        <a className={ACTION} {...rest}>
          <ActionIcon icon={icon} />
          {children}
        </a>
      </div>
    </div>
  );
}

/** A full-width row that opens another page. */
export function LinkRow({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-card px-4 font-bold shadow-sm hover:bg-page">
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

/** While part of a page loads. */
export function BlockSkeleton() {
  return (
    <div aria-busy="true" aria-label={t('app.loading')} className="space-y-3">
      <div className="h-24 animate-pulse rounded-2xl bg-line" />
      <div className="h-40 animate-pulse rounded-2xl bg-line" />
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
      className="mx-auto mb-0 mt-auto max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card p-0 text-ink open:flex sm:my-auto sm:rounded-3xl"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t('app.close')} className="-mr-2 grid size-11 place-items-center rounded-full text-muted hover:bg-page">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">{children}</div>
      {footer && <div className="shrink-0 space-y-2 border-t border-line p-4">{footer}</div>}
    </dialog>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div data-empty-state className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-card px-5 py-10 text-center">
      {icon}
      <p className="text-lg font-extrabold">{title}</p>
      {children && <p className="max-w-xs text-sm text-muted">{children}</p>}
    </div>
  );
}

export function Problem({ title, body, onRetry }: { title: string; body?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
      <TriangleAlert className="size-10 text-amber-600" aria-hidden />
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="text-sm text-muted">{body ?? t('app.errorBody')}</p>
      {onRetry && <Button onClick={onRetry}>{t('app.retry')}</Button>}
    </div>
  );
}

export function Skeleton() {
  return (
    <main aria-busy="true" aria-label={t('app.loading')} className="mx-auto max-w-lg space-y-3 p-4">
      <div className="h-14 animate-pulse rounded-2xl bg-line" />
      <div className="h-20 animate-pulse rounded-2xl bg-line" />
      <div className="h-36 animate-pulse rounded-2xl bg-line" />
      <div className="h-36 animate-pulse rounded-2xl bg-line" />
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
