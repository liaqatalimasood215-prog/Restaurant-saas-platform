import { ChefHat } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** compact: name hidden below 1024 px; iconOnly: name always hidden (collapsed sidebar); dark: white logo on the red sidebar top */
export function Logo({ compact = false, dark = false, iconOnly = false }: { compact?: boolean; dark?: boolean; iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <ChefHat className={cn('size-8 shrink-0', dark ? 'text-white' : 'text-brand')} strokeWidth={2.5} aria-hidden />
      <div className={cn('leading-none', iconOnly ? 'hidden' : compact && 'hidden lg:block')}>
        <p className={cn('text-xl font-black tracking-tight', dark ? 'text-white' : 'text-slate-900')}>
          {t('app.logoTop')}
        </p>
        <p className={cn('text-xs font-semibold', dark ? 'text-white/90' : 'text-slate-500')}>{t('app.logoBottom')}</p>
      </div>
    </div>
  );
}
