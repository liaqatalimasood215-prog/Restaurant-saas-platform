'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Avatar, Problem, Skeleton } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';

/** DEMO login: pick your account. Real phone + password login comes with the server (Phase 4). No public sign-up. */
export function LoginScreen({ restaurant, branch }: { restaurant: string; branch: string }) {
  const accounts = useApiQuery(() => getApi().listAccounts(restaurant, branch), [restaurant, branch]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (accounts.loading && !accounts.data) return <Skeleton />;
  if (!accounts.data) return <Problem title={t('app.errorTitle')} body={accounts.error?.message} onRetry={accounts.reload} />;

  const login = async (riderId: string) => {
    setBusy(true);
    setError(null);
    try {
      await getApi().login(restaurant, branch, riderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.errorBody'));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg space-y-3 px-4 py-5" data-login>
      <div>
        <h1 className="text-2xl font-black tracking-tight">{t('login.title')}</h1>
        <p className="text-sm text-stone-600">{t('login.choose')}</p>
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {accounts.data.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm text-stone-600">{t('login.none')}</p>}
      <ul className="space-y-2">
        {accounts.data.map((account) => {
          const blocked = !account.isActive || !account.activatedAt;
          return (
            <li key={account.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void login(account.id)}
                data-login-account={account.name}
                className={cn('flex min-h-16 w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-sm hover:bg-stone-50', blocked && 'opacity-70')}
              >
                <Avatar name={account.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{account.name}</span>
                  <span className="block text-sm text-stone-500">{account.phone}</span>
                </span>
                {!account.isActive && <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">{t('login.disabledBadge')}</span>}
                {account.isActive && !account.activatedAt && <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">{t('login.invitedBadge')}</span>}
                {!blocked && <ChevronRight className="size-5 text-stone-400" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-stone-600">{t('login.noSignUp')}</p>
      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{t('demo.login')}</p>
    </main>
  );
}
