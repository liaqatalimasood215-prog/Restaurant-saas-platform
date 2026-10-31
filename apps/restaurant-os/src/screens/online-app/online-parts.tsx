import type { ReactNode } from 'react';
import { CheckCircle2, Clock, Truck } from 'lucide-react';
import { ANDROID_FLOW_STEPS, canPublishWebsite, type OnlineAppView } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** The customer website's development address (PROJECT_RULES.md §3); the real domain comes with hosting. */
export const CUSTOMER_APP_ORIGIN = 'http://localhost:3001';

export const customerUrl = (path: string) => `${CUSTOMER_APP_ORIGIN}${path}`;

const LAN_ADDRESS = process.env.NEXT_PUBLIC_LAN_ADDRESS;

/** The link to share: on a phone `localhost` means the phone itself, so it uses this computer's Wi-Fi address (next.config.ts). */
export const customerShareUrl = (path: string) => (LAN_ADDRESS ? `http://${LAN_ADDRESS}:3001${path}` : customerUrl(path));

/** What every tab of the Online App page receives. */
export interface OnlineTabProps {
  view: OnlineAppView;
  canManage: boolean;
  canPublish: boolean;
  busy: boolean;
  run: (work: () => Promise<unknown>, done?: string) => Promise<void>;
}

export const linkButtonClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand bg-white px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft';

export function Heading({ icon: Icon, title }: { icon: typeof Truck; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      {title}
    </h2>
  );
}

/** One line of a checklist. A planned line is never shown with a green tick, and always says so in words. */
export function CheckRow({ done, label, note }: { done: boolean; label: string; note: string }) {
  const Icon = done ? CheckCircle2 : Clock;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={cn('mt-0.5 size-4 shrink-0', done ? 'text-green-600' : 'text-amber-600')} aria-hidden />
      <span className="min-w-0 flex-1 text-slate-800">{label}</span>
      <span className={cn('shrink-0 text-xs font-bold', done ? 'text-green-700' : 'text-amber-700')}>{note}</span>
    </li>
  );
}

export function CheckList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">{children}</ul>;
}

/** The PWA facts, the same on the Overview card and the PWA tab: only what is really true today. */
export function PwaChecks() {
  return (
    <CheckList>
      <CheckRow done label={t('onlineApp.pwaCard.mobileFirst')} note={t('onlineApp.demo')} />
      <CheckRow done={false} label={t('onlineApp.pwaCard.fullScreen')} note={t('onlineApp.pwaCard.notTested')} />
      <CheckRow done={false} label={t('onlineApp.pwaCard.android')} note={t('onlineApp.pwaCard.needsHosting')} />
      <CheckRow done={false} label={t('onlineApp.pwaCard.iphone')} note={t('onlineApp.pwaCard.needsHosting')} />
      <CheckRow done={false} label={t('onlineApp.pwaCard.offline')} note={t('onlineApp.planned')} />
    </CheckList>
  );
}

/** The future Android flow in order. */
export function AndroidSteps({ detailed = false }: { detailed?: boolean }) {
  return (
    <ol className="space-y-3">
      {ANDROID_FLOW_STEPS.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold text-white">{index + 1}</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">{t(`onlineApp.androidCard.steps.${step}.title`)}</span>
            {detailed && <span className="block text-sm text-slate-600">{t(`onlineApp.androidCard.steps.${step}.body`)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Publish Website: the website only, never anything of the Android app. Owner only. */
export function PublishWebsiteButton({ view, canPublish, busy, onPublish, className }: { view: OnlineAppView; canPublish: boolean; busy: boolean; onPublish: () => void; className?: string }) {
  const open = canPublishWebsite(view.publishing);
  const label = busy ? t('onlineApp.publishing') : open ? t('onlineApp.publishWebsite') : t('onlineApp.published');
  return (
    <Button className={className} onClick={onPublish} disabled={!canPublish || !open || busy} title={canPublish ? undefined : t('onlineApp.publishOwnerOnly')}>
      {!open && !busy && <CheckCircle2 className="size-4" aria-hidden />}
      {label}
    </Button>
  );
}
