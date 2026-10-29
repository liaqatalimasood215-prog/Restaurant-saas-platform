'use client';

import { cn } from '@/lib/cn';

/** An ON / OFF switch with a label (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  compact,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Only the switch is shown; the label is for screen readers */
  compact?: boolean;
}) {
  return (
    <label className={cn('flex items-center gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-green-600' : 'bg-slate-300')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
      {!compact && (
        <span>
          <span className="block text-sm font-bold text-slate-900">{label}</span>
          {hint && <span className="block text-xs text-slate-500">{hint}</span>}
        </span>
      )}
    </label>
  );
}
