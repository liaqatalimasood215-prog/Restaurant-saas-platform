'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { buyOptions, checkWaste, parseQuantity, wasteReasonsFor, type StockWasteReason, type WasteRequestRow } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { newId } from '@/lib/new-id';
import { stockText } from '../inventory/inventory-format';
import { optionLabel } from '../inventory/purchase-bill';

const STATUS_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'grey' } as const;

/**
 * W4 (owner, 2026-11-12): the Kitchen reports spoiled food from the KDS for the Owner's or a Manager's approval. One item per
 * report; no prices are shown (owner's decision 4). The food is held at once (the server); nothing is a loss until approved.
 */
export function ReportWasteDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const view = useApiQuery(() => getApi().getWasteReport(), []);
  const [itemId, setItemId] = useState('');
  const [unitKey, setUnitKey] = useState('main');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<StockWasteReason | ''>('');
  const [note, setNote] = useState('');
  const [thrownAway, setThrownAway] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => newId());

  const items = view.data?.items ?? [];
  const item = items.find((i) => i.id === itemId) ?? null;
  const options = item ? buyOptions(item) : [];

  const send = async () => {
    const line = { ingredientId: itemId, parts: [{ unitKey, quantityMilli: parseQuantity(quantity, { allowZero: false }) }], reason: reason || null, note };
    const at = new Date().toISOString();
    // The kitchen does not see the stock: the server checks the quantity against it
    const problem = checkWaste({ at, stage: 'STORAGE', lines: [line], note: '' }, items, () => Number.MAX_SAFE_INTEGER, Date.now());
    if (problem) return setError(t(`inventory.waste.errors.${problem.problem}`));
    setBusy(true);
    setError(null);
    try {
      await getApi().submitWasteRequest({ at, stage: item?.kind === 'PREPARED' ? 'HOLDING' : 'STORAGE', lines: [line], note: '', thrownAway, idempotencyKey: key });
      toast.show({ tone: 'success', title: t('kitchen.reportSent') });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const label = 'mb-1 block text-sm font-bold text-slate-900';
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('kitchen.reportTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void send()} disabled={busy || !view.data}>
            <Trash2 className="size-4" aria-hidden />
            {t('kitchen.reportSend')}
          </Button>
        </>
      }
    >
      {view.loading && !view.data ? (
        <LoadingState />
      ) : !view.data ? (
        <ErrorState message={view.error?.message} onRetry={view.reload} />
      ) : (
        <div className="space-y-3" data-report-waste>
          <p className="text-sm text-slate-600">{t('kitchen.reportBody')}</p>
          <label className="block">
            <span className={label}>{t('kitchen.reportItem')}</span>
            <select value={itemId} onChange={(e) => (setItemId(e.target.value), setUnitKey('main'), setReason(''), setError(null))} aria-label={t('kitchen.reportItem')} className={field}>
              <option value="">{t('kitchen.reportChoose')}</option>
              <optgroup label={t('kitchen.reportCooked')}>
                {items
                  .filter((i) => i.kind === 'PREPARED')
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label={t('kitchen.reportRaw')}>
                {items
                  .filter((i) => i.kind !== 'PREPARED')
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          {item && (
            <>
              <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
                <label className="block">
                  <span className={label}>{t('kitchen.reportQty')}</span>
                  <input value={quantity} onChange={(e) => (setQuantity(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('kitchen.reportQty')} className={`${field} text-right tabular-nums`} />
                </label>
                <label className="block min-w-0">
                  <span className={label}>{t('kitchen.reportUnit')}</span>
                  <select value={unitKey} onChange={(e) => setUnitKey(e.target.value)} aria-label={t('kitchen.reportUnit')} className={field}>
                    {options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {optionLabel(o, item)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className={label}>{t('kitchen.reportReason')}</span>
                <select value={reason} onChange={(e) => (setReason(e.target.value as StockWasteReason | ''), setError(null))} aria-label={t('kitchen.reportReason')} className={field}>
                  <option value="">{t('inventory.waste.chooseReason')}</option>
                  {wasteReasonsFor(item.kind).map((r) => (
                    <option key={r} value={r}>
                      {t(`inventory.waste.reasons.${r}`)}
                    </option>
                  ))}
                </select>
              </label>
              <input value={note} onChange={(e) => (setNote(e.target.value), setError(null))} maxLength={140} placeholder={reason === 'OTHER' ? t('inventory.waste.otherPlaceholder') : t('kitchen.reportNote')} aria-label={t('kitchen.reportNote')} className={field} />
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-800">
                <input type="checkbox" checked={thrownAway} onChange={(e) => setThrownAway(e.target.checked)} className="size-5 accent-brand" />
                {t('kitchen.reportThrown')}
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {error}
            </p>
          )}
          <MyReports rows={view.data.mine} />
        </div>
      )}
    </Dialog>
  );
}

function MyReports({ rows }: { rows: WasteRequestRow[] }) {
  return (
    <section className="border-t border-slate-100 pt-2" data-my-reports>
      <h3 className="text-sm font-extrabold text-slate-900">{t('kitchen.reportMine')}</h3>
      {rows.length === 0 && <p className="text-xs text-slate-500">{t('kitchen.reportNone')}</p>}
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((row) => (
          <li key={row.request.id} className="flex items-center gap-2 py-1.5" data-my-report={row.lines[0]?.name}>
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
              {row.lines.map((l) => `${l.name} ${stockText(l, l.stockMilli)}`).join(', ')}
            </span>
            <Badge tone={STATUS_TONE[row.request.status]}>{t(`inventory.reports.status.${row.request.status}`)}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
