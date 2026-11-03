'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronDown, Download, LogOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useDismiss } from '@/components/ui/use-dismiss';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { useInstallApp } from '@/lib/pwa';
import { useSession } from '@/lib/session';
import { useDemoFailure } from './use-demo-failure';

export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Profile of the logged-in person, top-right. There is no role switch here: staff cannot change
 * their own role; the Owner or a Manager does that in Staff.
 */
export function ProfileMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const failing = useDemoFailure();
  const install = useInstallApp();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  if (!session) return null;
  const { user } = session;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('profile.open')}
        className="flex min-h-12 items-center gap-2 rounded-xl px-1.5 hover:bg-slate-100 sm:px-2"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand bg-brand-gradient text-sm font-bold text-white shadow-brand">
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-bold text-slate-900">{user.name}</span>
          <span className="block text-xs text-slate-500">{t(`roles.${user.role}`)}</span>
        </span>
        <ChevronDown className="size-4 text-slate-500" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,19rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-3 px-2">
            <p className="font-bold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-600">{t(`roles.${user.role}`)}</p>
            <p className="text-xs text-slate-500">{t(`roleHints.${user.role}`)}</p>
          </div>

          {!install.isInstalled && (install.canPrompt || install.isIos) && (
            <div className="mb-2 border-t border-slate-100 pt-2">
              {install.canPrompt ? (
                <button
                  type="button"
                  onClick={() => void install.install()}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Download className="size-5 text-brand" aria-hidden />
                  {t('profile.installApp')}
                </button>
              ) : (
                <p className="px-3 py-2 text-xs text-slate-600">{t('profile.installIos')}</p>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-2">
            <p className="mb-1 px-3 text-xs font-bold uppercase tracking-wider text-slate-500">DEMO</p>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={failing}
                onChange={(e) => getDemoControls().setSimulatedFailure(e.target.checked)}
                className="size-5 accent-brand"
              />
              <span className="text-sm font-semibold text-slate-800">{t('demoTools.simulateError')}</span>
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

          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void getApi().logout();
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-700 hover:bg-red-50"
            >
              <LogOut className="size-5" aria-hidden />
              {t('profile.logout')}
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
