'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { STAFF_ROLES, type StaffUser } from '@restaurant-saas/shared';
import { initials } from '@/components/shell/profile-menu';
import { Logo } from '@/components/shell/logo';
import { DemoModeIndicator } from '@/components/shell/demo-mode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { getDemoControls } from '@/lib/api';
import { useInstallApp } from '@/lib/pwa';

/**
 * Simple DEMO login (Phases 1–3): pick your account. Each person then sees only the screens and
 * buttons of their role. Real phone + password login, checked by the server, comes in Phase 4.
 */
export function LoginScreen() {
  const router = useRouter();
  const install = useInstallApp();
  const [accounts] = useState<StaffUser[]>(() => getDemoControls().listLoginAccounts());

  const login = (user: StaffUser) => {
    getDemoControls().demoLogin(user.id);
    // Home decides the start screen from this person's permissions.
    router.replace('/');
  };

  return (
    <div className="min-h-dvh bg-surface px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Logo />
          <DemoModeIndicator />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {t('login.title')} <Badge tone="amber">{t('login.demo')}</Badge>
        </h1>
        <p className="mb-5 mt-1 text-sm text-slate-600">{t('login.body')}</p>

        {STAFF_ROLES.filter((role) => accounts.some((a) => a.role === role)).map((role) => (
          <section key={role} className="mb-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t(`roles.${role}`)} · {t(`roleHints.${role}`)}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {accounts
                .filter((a) => a.role === role)
                .map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => login(account)}
                      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left shadow-sm hover:border-brand"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-800 font-bold text-white">
                        {initials(account.name)}
                      </span>
                      <span className="leading-tight">
                        <span className="block font-bold text-slate-900">{account.name}</span>
                        <span className="block text-xs text-slate-500">{t(`roles.${account.role}`)}</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        <p className="mb-6 text-xs text-slate-500">{t('login.riders')}</p>

        {!install.isInstalled && install.canPrompt && (
          <Button variant="outline" size="lg" className="w-full" onClick={() => void install.install()}>
            <Download className="size-5" aria-hidden />
            {t('profile.installApp')}
          </Button>
        )}
        {!install.isInstalled && !install.canPrompt && install.isIos && (
          <p className="text-center text-sm text-slate-600">{t('profile.installIos')}</p>
        )}
      </div>
    </div>
  );
}
