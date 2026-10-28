'use client';

import { useState } from 'react';
import { Plus, Search, UserRound } from 'lucide-react';
import type { CustomerSummary } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';

export interface CustomerValue {
  name: string;
  phone: string;
  address: string;
}

/**
 * Find a customer from earlier orders (name or phone) or type a new one. Customers are saved with
 * the order; a full customer list (P7) is not built yet. When the customer is optional the box
 * stays folded into one line until the cashier opens it (keeps the bill short on a tablet).
 */
export function CustomerFields({
  value,
  onChange,
  withAddress,
  optional,
}: {
  value: CustomerValue;
  onChange: (value: CustomerValue) => void;
  withAddress: boolean;
  optional: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSummary[] | null>(null);
  const [open, setOpen] = useState(!optional || Boolean(value.name || value.phone));

  const search = async () => {
    try {
      setResults(await getApi().searchCustomers(query));
    } catch {
      setResults([]);
    }
  };
  const field = 'min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';

  if (optional && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 w-full items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <UserRound className="size-4" aria-hidden />
        {t('pos.customerOptional')}
        <Plus className="ml-auto size-4 text-slate-500" aria-hidden />
      </button>
    );
  }

  return (
    <fieldset className="space-y-1.5 rounded-xl bg-slate-50 p-2">
      <legend className="flex items-center gap-1 px-1 text-xs font-bold text-slate-900">
        <UserRound className="size-4" aria-hidden />
        {optional ? t('pos.customerOptional') : t('pos.customer')}
      </legend>
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void search())}
          placeholder={t('pos.findCustomer')}
          aria-label={t('pos.findCustomer')}
          className={field}
        />
        <button type="button" onClick={search} aria-label={t('pos.findCustomer')} className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Search className="size-5" aria-hidden />
        </button>
      </div>
      {results && (
        <ul className="space-y-1">
          {results.length === 0 && <li className="text-xs text-slate-500">{t('pos.noCustomer')}</li>}
          {results.map((c) => (
            <li key={c.phone}>
              <button
                type="button"
                onClick={() => {
                  onChange({ name: c.name, phone: c.phone, address: c.address });
                  setResults(null);
                  setQuery('');
                }}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg bg-white px-3 text-left text-sm hover:bg-brand-soft"
              >
                <span>
                  <span className="font-bold">{c.name}</span> · {c.phone}
                </span>
                <span className="text-xs text-slate-500">{t('pos.orderCount', { n: c.orderCount })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={t('online.customerName')} aria-label={t('online.customerName')} className={field} />
        <input value={value.phone} inputMode="tel" onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="0300-1234567" aria-label={t('staff.phone')} className={field} />
      </div>
      {withAddress && (
        <input value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} placeholder={t('online.address')} aria-label={t('online.address')} className={field} />
      )}
    </fieldset>
  );
}
