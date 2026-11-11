'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { MOVEMENT_TYPES, periodRange, type InventoryView, type MovementType, type StockLedgerRow } from '@restaurant-saas/shared';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { stockText, whenText } from './inventory-format';

const PERIODS = ['TODAY', 'WEEK', 'MONTH', 'ALL'] as const;
type Period = (typeof PERIODS)[number];

/**
 * Stock Movements (inventory phase 1): every stock change with its reason, who made it and when, and the stock it
 * left. Filters: ingredient, kind of change, period, staff. Nothing is ever deleted.
 */
export function MovementsTab({ view, ingredientId: start }: { view: InventoryView; ingredientId: string | null }) {
  const [ingredientId, setIngredientId] = useState(start ?? '');
  const [type, setType] = useState<MovementType | ''>('');
  const [period, setPeriod] = useState<Period>('ALL');
  const [staffId, setStaffId] = useState('');
  const range = periodRange(period, view.today);
  const ledger = useApiQuery(
    () => getApi().getStockLedger({ ingredientId: ingredientId || null, type: type || null, from: range.from, to: range.to, staffId: staffId || null }),
    [ingredientId, type, period, staffId],
  );
  const select = 'min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800';
  const filtered = Boolean(ingredientId || type || staffId || period !== 'ALL');

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} aria-label={t('inventory.ledger.ingredient')} className={cn(select, 'min-w-44 flex-1 sm:flex-none')}>
          <option value="">{t('inventory.ledger.allIngredients')}</option>
          {view.ingredients.map((r) => (
            <option key={r.ingredient.id} value={r.ingredient.id}>
              {r.ingredient.name}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as MovementType | '')} aria-label={t('inventory.ledger.type')} className={select}>
          <option value="">{t('inventory.ledger.allTypes')}</option>
          {MOVEMENT_TYPES.map((m) => (
            <option key={m} value={m}>
              {t(`inventory.movementTypes.${m}`)}
            </option>
          ))}
        </select>
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label={t('inventory.ledger.staff')} className={select}>
          <option value="">{t('inventory.ledger.allStaff')}</option>
          {(ledger.data?.staff ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex gap-1 rounded-xl bg-slate-200/60 p-1" role="group" aria-label={t('inventory.ledger.period')}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={cn('press min-h-8 rounded-lg px-2.5 text-sm font-bold pointer-coarse:min-h-9', period === p ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-900')}
            >
              {t(`inventory.ledger.periods.${p}`)}
            </button>
          ))}
        </div>
        {filtered && (
          <button
            type="button"
            onClick={() => (setIngredientId(''), setType(''), setStaffId(''), setPeriod('ALL'))}
            className="press min-h-10 rounded-xl px-2.5 text-sm font-bold text-brand hover:bg-brand-soft"
          >
            {t('inventory.ledger.clear')}
          </button>
        )}
        {ledger.data && <span className="ml-auto text-xs font-semibold text-slate-500">{ledger.data.total === 1 ? t('inventory.ledger.countOne') : t('inventory.ledger.count', { n: ledger.data.total })}</span>}
      </div>
      <p className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
        <History className="size-3.5 text-slate-400" aria-hidden />
        {t('inventory.ledger.hint')}
      </p>

      {ledger.loading && !ledger.data ? (
        <LoadingState />
      ) : !ledger.data ? (
        <ErrorState message={ledger.error?.message} onRetry={ledger.reload} />
      ) : ledger.data.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">{t('inventory.ledger.empty')}</p>
      ) : (
        <>
          <Card className="hidden overflow-hidden rounded-xl lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t('inventory.ledger.columns.when')}</th>
                  <th className="px-3 py-2">{t('inventory.ledger.columns.ingredient')}</th>
                  <th className="px-3 py-2 text-right">{t('inventory.ledger.columns.change')}</th>
                  <th className="px-3 py-2">{t('inventory.ledger.columns.why')}</th>
                  <th className="px-3 py-2">{t('inventory.ledger.columns.by')}</th>
                  <th className="px-3 py-2 text-right">{t('inventory.ledger.columns.after')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.data.rows.map((row) => (
                  <tr key={row.movement.id} data-ledger-row={row.ingredientName} className="hover:bg-brand-soft/30">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{whenText(row.movement.createdAt)}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{row.ingredientName}</td>
                    <td className="px-3 py-2 text-right">
                      <Change row={row} />
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <Why row={row} />
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.byName ?? '—'}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', row.balanceAfterMilli < 0 ? 'text-red-700' : 'text-slate-900')}>{balance(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
            {ledger.data.rows.map((row) => (
              <li key={row.movement.id} data-ledger-card={row.ingredientName}>
                <Card className="flex items-start justify-between gap-3 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{row.ingredientName}</p>
                    <p className="text-xs text-slate-600">
                      <Why row={row} />
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.byName ?? '—'} · {whenText(row.movement.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Change row={row} />
                    <p className="text-xs text-slate-500">
                      {t('inventory.ledger.columns.after')}: {balance(row)}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          {ledger.data.total > ledger.data.rows.length && <p className="text-center text-xs text-slate-500">{t('inventory.ledger.more', { shown: ledger.data.rows.length, total: ledger.data.total })}</p>}
        </>
      )}
    </div>
  );
}

function units(row: StockLedgerRow) {
  return { purchaseUnit: row.purchaseUnit, stockUnit: row.stockUnit };
}

function balance(row: StockLedgerRow): string {
  return row.balanceAfterMilli < 0 ? `−${stockText(units(row), -row.balanceAfterMilli)}` : stockText(units(row), row.balanceAfterMilli);
}

function Change({ row }: { row: StockLedgerRow }) {
  const qty = row.movement.quantityMilli;
  return <span className={cn('font-extrabold tabular-nums', qty > 0 ? 'text-green-700' : 'text-brand')}>{`${qty > 0 ? '+' : '−'}${stockText(units(row), Math.abs(qty))}`}</span>;
}

function Why({ row }: { row: StockLedgerRow }) {
  const { movement } = row;
  return (
    <>
      {movement.reason
        ? t(`inventory.reasons.${movement.reason}`)
        : movement.wasteReason
          ? `${t('inventory.movementTypes.WASTE')}: ${t(`inventory.waste.reasons.${movement.wasteReason}`)}`
          : t(`inventory.movementTypes.${movement.type}`)}
      {movement.note && <span className="text-slate-500"> — {movement.note}</span>}
    </>
  );
}
