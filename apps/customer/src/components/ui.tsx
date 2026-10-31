'use client';

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Minus, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

export const primaryLinkClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-dark';

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark',
        variant === 'secondary' && 'border border-stone-200 bg-white text-stone-800 hover:bg-stone-50',
        variant === 'ghost' && 'text-stone-600 hover:bg-stone-100',
        className,
      )}
      {...rest}
    />
  );
}

/** A centred box on large screens, a sheet from the bottom on phones. */
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
      {footer && <div className="shrink-0 border-t border-stone-100 p-4">{footer}</div>}
    </dialog>
  );
}

/** Quantity. With onRemove, the minus at the lowest quantity becomes a bin that takes the line away. */
export function Stepper({ value, min, onChange, name, onRemove }: { value: number; min: number; onChange: (n: number) => void; name?: string; onRemove?: { label: string; run: () => void } }) {
  const button = 'grid size-11 place-items-center rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40';
  const removing = onRemove && value <= min;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {removing ? (
        <button type="button" className={button} onClick={onRemove.run} aria-label={onRemove.label}>
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : (
        <button type="button" className={button} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={name ? t('item.decreaseFor', { name }) : t('item.decrease')}>
          <Minus className="size-4" aria-hidden />
        </button>
      )}
      <span className="min-w-6 text-center font-extrabold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={cn(button, 'text-brand')} disabled={value >= 50} onClick={() => onChange(value + 1)} aria-label={name ? t('item.increaseFor', { name }) : t('item.increase')}>
        <Plus className="size-4" aria-hidden />
      </button>
    </span>
  );
}

export function Problem({ title, body, onRetry, children }: { title: string; body?: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="mx-auto my-10 max-w-md rounded-3xl border border-stone-100 bg-white p-8 text-center shadow-sm">
      <TriangleAlert className="mx-auto mb-3 size-9 text-amber-500" aria-hidden />
      <h1 className="text-xl font-extrabold">{title}</h1>
      {body && <p className="mt-1 text-sm text-stone-600">{body}</p>}
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          {t('app.retry')}
        </Button>
      )}
      {children}
    </div>
  );
}

/** Nothing to show yet, and what to do about it. */
export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="py-10 text-center" data-empty-state>
      <span className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">{icon}</span>
      <p className="font-extrabold">{title}</p>
      {body && <p className="mx-auto max-w-xs text-sm text-stone-500">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** The label on everything that is a screen only: OTP, payments, map, rider contact (PROJECT_RULES.md §17). */
export function NotConnected({ className }: { className?: string }) {
  return <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[0.625rem] font-extrabold tracking-wide text-amber-900', className)}>{t('notConnected')}</span>;
}

const ART: { match: RegExp; emoji: string; tone: string }[] = [
  { match: /pizza/i, emoji: '🍕', tone: 'from-orange-100 to-red-100' },
  { match: /burger/i, emoji: '🍔', tone: 'from-amber-100 to-orange-100' },
  { match: /karahi/i, emoji: '🍲', tone: 'from-orange-100 to-red-50' },
  { match: /tikka|kabab|bbq/i, emoji: '🍢', tone: 'from-orange-100 to-amber-50' },
  { match: /chicken|wing/i, emoji: '🍗', tone: 'from-orange-100 to-amber-50' },
  { match: /fries|side/i, emoji: '🍟', tone: 'from-yellow-100 to-amber-50' },
  { match: /garlic|bread/i, emoji: '🥖', tone: 'from-amber-100 to-yellow-50' },
  { match: /pasta/i, emoji: '🍝', tone: 'from-rose-100 to-orange-50' },
  { match: /naan/i, emoji: '🫓', tone: 'from-amber-100 to-yellow-50' },
  { match: /brownie|dessert|cake/i, emoji: '🍫', tone: 'from-amber-100 to-stone-100' },
  { match: /deal|feast|party/i, emoji: '🍱', tone: 'from-red-100 to-amber-100' },
  { match: /lassi/i, emoji: '🥛', tone: 'from-sky-50 to-stone-50' },
  { match: /water/i, emoji: '💧', tone: 'from-sky-100 to-cyan-50' },
  { match: /drink|juice|tea/i, emoji: '🥤', tone: 'from-sky-100 to-cyan-50' },
];

/** The picture of a product: a food illustration until real photos (photo upload is Phase 7). */
export function ProductArt({ name, className, emojiClassName = 'text-5xl' }: { name: string; className?: string; emojiClassName?: string }) {
  const art = ART.find((a) => a.match.test(name)) ?? { emoji: '🍽️', tone: 'from-stone-100 to-stone-50' };
  return (
    <span aria-hidden className={cn('grid place-items-center bg-gradient-to-br', art.tone, className)}>
      <span className={emojiClassName}>{art.emoji}</span>
    </span>
  );
}

export const fieldClass = 'min-h-12 w-full scroll-my-24 rounded-2xl border border-stone-300 bg-white px-4 text-base outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-line';
