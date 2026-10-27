'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, RotateCcw } from 'lucide-react';
import { canUseApp, HOME_SECTION, type StaffRole, type StaffUser } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useDismiss } from '@/components/ui/use-dismiss';
import { t } from '@/i18n';
import { getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { useDemoFailure } from './use-demo-failure';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** DEMO role switcher — replaces login in Phases 1–3 and is clearly labelled DEMO (PROJECT_RULES.md §16). */
export function RoleSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);
  const failing = useDemoFailure();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!session) return null;
  const { user } = session;

  const toggle = () => {
    if (!open) setUsers(getDemoControls().listDemoUsers());
    setOpen(!open);
  };

  const switchTo = (role: StaffRole) => {
    getDemoControls().switchRole(role);
    setOpen(false);
    router.push(canUseApp(role, 'restaurant-os') ? `/${HOME_SECTION[role as keyof typeof HOME_SECTION]}` : '/');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('roleSwitcher.open')}
        className="flex min-h-12 items-center gap-2 rounded-xl px-1.5 hover:bg-slate-100 sm:px-2"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-bold text-slate-900">{t(`roles.${user.role}`)}</span>
          <span className="block text-xs text-slate-500">{user.name}</span>
        </span>
        <Badge tone="brand" className="hidden sm:inline-flex">
          DEMO
        </Badge>
        <ChevronDown className="size-4 text-slate-500" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,20rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">{t('roleSwitcher.title')}</p>
            <Badge tone="brand">DEMO</Badge>
          </div>
          <p className="mb-3 text-xs text-slate-500">{t('roleSwitcher.note')}</p>
          <ul className="space-y-1">
            {users.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => switchTo(u.role)}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left',
                    u.role === user.role ? 'bg-brand-soft' : 'hover:bg-slate-50',
                  )}
                >
                  <span className="flex-1 leading-tight">
                    <span className="block text-sm font-bold text-slate-900">{t(`roles.${u.role}`)}</span>
                    <span className="block text-xs text-slate-500">
                      {u.name}
                      {u.role === 'KITCHEN' && u.stationIds.length === 0 && ` · ${t('roleSwitcher.allStations')}`}
                    </span>
                  </span>
                  {u.role === user.role && <Check className="size-5 text-brand" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t('roleSwitcher.tools')}</p>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={failing}
                onChange={(e) => getDemoControls().setSimulatedFailure(e.target.checked)}
                className="size-5 accent-brand"
              />
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-slate-800">{t('roleSwitcher.simulateError')}</span>
                <span className="block text-xs text-slate-500">{t('roleSwitcher.simulateErrorHint')}</span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmReset(true);
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <RotateCcw className="size-5 text-slate-500" aria-hidden />
              {t('demo.reset')}
            </button>
          </div>
        </div>
      )}

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t('demo.resetConfirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              {t('nav.close')}
            </Button>
            <Button
              onClick={() => {
                getDemoControls().resetData();
                setConfirmReset(false);
              }}
            >
              {t('demo.reset')}
            </Button>
          </>
        }
      >
        {t('demo.resetConfirmBody')}
      </Dialog>
    </div>
  );
}
