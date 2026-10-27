import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Big − / + buttons for quantity and guests (48 px touch targets). */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  label,
  size = 'md',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: 'sm' | 'md';
}) {
  const button = cn(
    'flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40',
    size === 'md' ? 'size-12' : 'size-10',
  );
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`${label} −`}>
        <Minus className="size-5" aria-hidden />
      </button>
      <span className={cn('min-w-8 text-center font-extrabold tabular-nums', size === 'md' ? 'text-xl' : 'text-base')}>
        {value}
      </span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`${label} +`}>
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  );
}
