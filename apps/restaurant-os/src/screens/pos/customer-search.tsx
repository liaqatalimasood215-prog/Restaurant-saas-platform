'use client';

import { useCallback, useRef, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import type { CustomerSummary } from '@restaurant-saas/shared';
import { useDismiss } from '@/components/ui/use-dismiss';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';

export type PickedCustomer = Pick<CustomerSummary, 'name' | 'phone' | 'address'>;

/**
 * Find customer in the POS title row (owner, 2026-11-10: the only customer search of a takeaway bill). A name or phone as he
 * types (from 2 letters) lists the earlier customers; a tap puts one on the bill. Nobody found: a new customer is added with a
 * name (and a phone when known), the search text filled in.
 */
export function CustomerSearch({ onPick }: { onPick: (customer: PickedCustomer) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerSummary[] | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setResults(null), []);
  useDismiss(ref, results !== null, close);

  const search = async (text: string) => {
    if (text.trim().length < 2) return setResults(null);
    // A new customer starts with what was typed: digits are the phone, anything else the name
    const digits = /^[\d\s+-]+$/.test(text.trim());
    setName(digits ? '' : text.trim());
    setPhone(digits ? text.trim() : '');
    try {
      setResults(await getApi().searchCustomers(text));
    } catch {
      setResults([]);
    }
  };
  const pick = (customer: PickedCustomer) => {
    onPick(customer);
    setResults(null);
    setQuery('');
  };
  const field = 'min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';

  return (
    <div ref={ref} className="relative" data-customer-search>
      <label className="flex min-h-11 w-44 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 shadow-sm transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 md:w-48 xl:w-64 xl:gap-2 xl:px-3">
        <Search className="size-4 shrink-0 text-slate-400 xl:size-5" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            void search(e.target.value);
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void search(query))}
          placeholder={t('pos.findCustomer')}
          aria-label={t('pos.findCustomer')}
          className="w-full bg-transparent text-sm"
        />
      </label>
      {results && (
        <div className="absolute right-0 z-30 mt-1.5 w-[min(92vw,22rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <ul className="space-y-1">
            {results.map((c) => (
              <li key={c.phone}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm hover:bg-brand-soft"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-bold">{c.name}</span> · {c.phone}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{t('pos.orderCount', { n: c.orderCount })}</span>
                </button>
              </li>
            ))}
          </ul>
          {results.length === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) pick({ name: name.trim(), phone: phone.trim(), address: '' });
              }}
              className="space-y-1.5"
              data-new-customer
            >
              <p className="px-1 text-sm text-slate-500">{t('pos.noCustomerFound')}</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('pos.newCustomerName')} aria-label={t('pos.newCustomerName')} className={field} />
              <input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" aria-label={t('pos.newCustomerPhone')} className={field} />
              <button type="submit" disabled={!name.trim()} className="press bg-brand-gradient flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white shadow-brand disabled:opacity-50">
                <UserPlus className="size-4" aria-hidden />
                {t('pos.addNewCustomer')}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
