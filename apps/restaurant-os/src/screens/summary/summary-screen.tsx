'use client';

import { useState, type ReactNode } from 'react';
import { BadgePercent, Ban, Banknote, CreditCard, HandCoins, ListOrdered, ReceiptText, Smartphone, Trophy, Undo2, Wallet } from 'lucide-react';
import { formatPaisa, formatQuantity, type DaySummaryView, type PaymentMethod } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = { CASH: Banknote, CARD: CreditCard, WALLET: Smartphone };

/** "Thu 30 Oct" */
const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Today's Summary (Preview 5, MASTER_PROMPT.md §5.7, Test A step 7): one business day — sales by order
 * type and payment method, refunds, number of orders, tips per waiter, top items, voids and discounts with
 * who and why. Owner, and the Manager when Role Permissions allow "Reports".
 */
export function SummaryScreen() {
  const [date, setDate] = useState<string | null>(null);
  const day = useApiQuery(() => getApi().getDaySummary(date), [date]);
  const header = (
    <ScreenHeader
      title={t('nav.summary')}
      status="DEMO_PROTOTYPE"
      description={t('summary.description')}
      actions={
        day.data && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            {t('summary.day')}
            <select
              value={day.data.businessDate}
              onChange={(e) => setDate(e.target.value === day.data?.today ? null : e.target.value)}
              aria-label={t('summary.day')}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
            >
              {day.data.dates.map((d) => (
                <option key={d} value={d}>
                  {d === day.data?.today ? t('summary.today', { day: dayLabel(d) }) : dayLabel(d)}
                </option>
              ))}
            </select>
          </label>
        )
      }
    />
  );
  if (day.loading && !day.data) return (<>{header}<LoadingState /></>);
  if (!day.data) return (<>{header}<ErrorState message={day.error?.message} onRetry={day.reload} /></>);
  return (
    <>
      {header}
      <DayReport view={day.data} />
    </>
  );
}

function DayReport({ view }: { view: DaySummaryView }) {
  const s = view.summary;
  const name = (id: string | null) => (id ? (view.names[id] ?? t('summary.unknown')) : t('summary.counter'));
  const nothing = s.paidOrders + s.openOrders + s.cancelled.length === 0;
  if (nothing) return <EmptyState title={t('summary.empty', { day: dayLabel(view.businessDate) })} />;
  const maxType = Math.max(1, ...s.byType.map((x) => x.sales));
  const maxMethod = Math.max(1, ...s.byMethod.map((x) => x.amount));
  const maxItem = Math.max(1, ...s.topItems.map((x) => x.amount));

  return (
    <div className="space-y-4" data-day-summary={view.businessDate}>
      {/* Hero + KPI row */}
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_3fr]">
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-slate-600">{t('summary.sales')}</p>
            <p className="text-5xl font-extrabold tracking-tight text-slate-900" data-kpi="sales">
              {formatPaisa(s.sales)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{t('summary.salesHint', { n: s.paidOrders })}</p>
          </CardBody>
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Tile label={t('summary.averageBill')} value={formatPaisa(s.averageBill)} kpi="average" />
          <Tile label={t('summary.cashReceived')} value={formatPaisa(s.cashReceived)} note={view.withRiders > 0 ? t('summary.withRiders', { amount: formatPaisa(view.withRiders) }) : t('summary.cashHint')} kpi="cash" />
          <Tile label={t('summary.tips')} value={formatPaisa(s.tips)} note={t('summary.tipsHint')} kpi="tips" />
          <Tile label={t('summary.open')} value={t('summary.openValue', { n: s.openOrders })} note={s.openOrders > 0 ? t('summary.due', { amount: formatPaisa(s.amountDue) }) : undefined} kpi="open" />
          <Tile label={t('summary.refunds')} value={formatPaisa(s.refundTotal)} note={t('summary.count', { n: s.refunds.length })} kpi="refunds" />
          <Tile label={t('summary.taxService')} value={formatPaisa(s.tax + s.serviceCharge)} note={t('summary.taxServiceParts', { tax: formatPaisa(s.tax), service: formatPaisa(s.serviceCharge) })} kpi="tax" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={ReceiptText} title={t('summary.byType')}>
          <Table head={[t('summary.type'), t('summary.orders'), t('summary.salesColumn')]}>
            {s.byType.map((row) => (
              <tr key={row.type} data-type-row={row.type}>
                <td className="py-2 pr-3 font-semibold text-slate-800">{t(`orderType.${row.type}`)}</td>
                <td className="py-2 pr-3 tabular-nums text-slate-700">{row.orders}</td>
                <td className="py-2">
                  <Amount value={row.sales} max={maxType} />
                </td>
              </tr>
            ))}
          </Table>
        </Panel>

        <Panel icon={Wallet} title={t('summary.byMethod')} note={t('summary.byMethodHint')}>
          <Table head={[t('summary.method'), t('summary.amount')]}>
            {s.byMethod.map((row) => {
              const Icon = METHOD_ICONS[row.method];
              return (
                <tr key={row.method} data-method-row={row.method}>
                  <td className="py-2 pr-3 font-semibold text-slate-800">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-slate-500" aria-hidden />
                      {t(`summary.methods.${row.method}`)}
                    </span>
                  </td>
                  <td className="py-2">
                    <Amount value={row.amount} max={maxMethod} />
                  </td>
                </tr>
              );
            })}
          </Table>
        </Panel>

        <Panel icon={Trophy} title={t('summary.topItems')}>
          {s.topItems.length === 0 ? (
            <p className="text-sm text-slate-500">{t('summary.none')}</p>
          ) : (
            <Table head={['#', t('summary.item'), t('summary.quantity'), t('summary.amount')]}>
              {s.topItems.map((row, index) => (
                <tr key={row.name} data-top-item={row.name}>
                  <td className="py-2 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                  <td className="py-2 pr-3 font-semibold text-slate-800">{row.name}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-700">{formatQuantity(row.quantity, row.unit).replace(' ×', '')}</td>
                  <td className="py-2">
                    <Amount value={row.amount} max={maxItem} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel icon={HandCoins} title={t('summary.tipsByWaiter')}>
          {s.tipsByWaiter.length === 0 ? (
            <p className="text-sm text-slate-500">{t('summary.noTips')}</p>
          ) : (
            <Table head={[t('summary.waiter'), t('summary.amount')]}>
              {s.tipsByWaiter.map((row) => (
                <tr key={row.waiterId ?? 'counter'} data-tip-row={name(row.waiterId)}>
                  <td className="py-2 pr-3 font-semibold text-slate-800">{name(row.waiterId)}</td>
                  <td className="py-2 tabular-nums font-semibold text-slate-900">{formatPaisa(row.amount)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        <Panel icon={BadgePercent} title={t('summary.discounts', { amount: formatPaisa(s.discountTotal) })}>
          <WhoWhy
            rows={s.discounts.map((d) => ({ key: `${d.orderId}`, order: d.dailyNumber, what: '', amount: d.amount, reason: d.reason, by: name(d.by) }))}
            empty={t('summary.noDiscounts')}
          />
        </Panel>

        <Panel icon={Ban} title={t('summary.voids', { amount: formatPaisa(s.voidTotal) })}>
          <WhoWhy
            rows={s.voids.map((v, i) => ({ key: `${v.orderId}-${i}`, order: v.dailyNumber, what: `${formatQuantity(v.quantity, v.unit)} ${v.item}`, amount: v.amount, reason: v.reason ?? '', by: name(v.by) }))}
            empty={t('summary.noVoids')}
          />
        </Panel>

        <Panel icon={Undo2} title={t('summary.refundList', { amount: formatPaisa(s.refundTotal) })}>
          <WhoWhy
            rows={s.refunds.map((r, i) => ({ key: `${r.orderId}-${i}`, order: r.dailyNumber, what: t(`summary.methods.${r.method}`), amount: r.amount, reason: r.reason ?? '', by: name(r.by) }))}
            empty={t('summary.noRefunds')}
          />
        </Panel>

        <Panel icon={ListOrdered} title={t('summary.cancelled', { n: s.cancelled.length })}>
          <WhoWhy
            rows={s.cancelled.map((c) => ({ key: c.orderId, order: c.dailyNumber, what: t(`orderType.${c.type}`), amount: null, reason: c.reason ?? '', by: name(c.by) }))}
            empty={t('summary.noCancelled')}
          />
        </Panel>
      </div>
      <p className="text-xs text-slate-500">{t('summary.note')}</p>
    </div>
  );
}

function Tile({ label, value, note, kpi }: { label: string; value: string; note?: string; kpi: string }) {
  return (
    <Card>
      <CardBody className="p-3">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-xl font-extrabold text-slate-900" data-kpi={kpi}>
          {value}
        </p>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </CardBody>
    </Card>
  );
}

function Panel({ icon: Icon, title, note, children }: { icon: typeof Wallet; title: string; note?: string; children: ReactNode }) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
            <Icon className="size-4" aria-hidden />
          </span>
          {title}
        </h2>
        {note && <p className="text-xs text-slate-500">{note}</p>}
        {children}
      </CardBody>
    </Card>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            {head.map((h) => (
              <th key={h} scope="col" className="py-1.5 pr-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">{children}</tbody>
      </table>
    </div>
  );
}

/** The amount in writing, with a thin bar of one colour for "how big" (the number carries the meaning). */
function Amount({ value, max }: { value: number; max: number }) {
  return (
    <span className="flex items-center gap-2" title={formatPaisa(value)}>
      <span className="w-24 shrink-0 tabular-nums font-semibold text-slate-900">{formatPaisa(value)}</span>
      <span className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <span className={cn('block h-full rounded-full bg-slate-700')} style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </span>
    </span>
  );
}

/** Discounts, voids, refunds and cancellations: which order, what, how much, why and who. */
function WhoWhy({ rows, empty }: { rows: { key: string; order: number; what: string; amount: number | null; reason: string; by: string }[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <Table head={[t('summary.orderNo'), t('summary.what'), t('summary.amount'), t('summary.why'), t('summary.who')]}>
      {rows.map((r) => (
        <tr key={r.key}>
          <td className="py-2 pr-3 tabular-nums text-slate-700">#{r.order}</td>
          <td className="py-2 pr-3 text-slate-800">{r.what || '—'}</td>
          <td className="py-2 pr-3 tabular-nums font-semibold text-slate-900">{r.amount === null ? '—' : formatPaisa(r.amount)}</td>
          <td className="py-2 pr-3 text-slate-700">{r.reason || '—'}</td>
          <td className="py-2 font-semibold text-slate-800">{r.by}</td>
        </tr>
      ))}
    </Table>
  );
}
