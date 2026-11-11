import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand bg-brand-gradient text-white shadow-brand hover:brightness-105 disabled:bg-none disabled:bg-brand/50 disabled:shadow-none',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:text-slate-400',
  outline: 'border-2 border-brand text-brand bg-white hover:bg-brand-soft disabled:opacity-50',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
};

/** Touch targets are at least 48 px high (MASTER_PROMPT.md §11); 'sm' (40 px, 44 px on touch screens) is for dense management lists. */
const SIZES: Record<Size, string> = {
  sm: 'min-h-10 px-3 text-sm pointer-coarse:min-h-11',
  md: 'min-h-12 px-4 text-sm',
  lg: 'min-h-14 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'press inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}
