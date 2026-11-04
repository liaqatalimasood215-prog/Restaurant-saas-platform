'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** md = forms (default), lg = longer forms in two columns, xl = wide screens such as the Add Staff wizard */
  size?: 'md' | 'lg' | 'xl';
}

/** Accessible modal built on the native <dialog> element (focus trap and Escape for free). */
export function Dialog({ open, onClose, title, children, footer, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        // Title and buttons stay in view; only the middle scrolls on short screens.
        'm-auto max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/50 open:flex',
        size === 'xl' ? 'w-[min(96vw,64rem)]' : size === 'lg' ? 'w-[min(94vw,44rem)]' : 'w-[min(92vw,30rem)]',
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.close')}
          className="-m-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-700">{children}</div>
      {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
    </dialog>
  );
}
