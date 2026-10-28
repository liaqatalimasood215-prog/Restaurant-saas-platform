'use client';

import { useState } from 'react';
import { Bike, Check, Clock, MapPin, PackageCheck, Phone, Printer, Wallet, X } from 'lucide-react';
import {
  availableActions,
  formatPaisa,
  formatQuantity,
  type OrderView,
  type StaffRole,
  type StaffUser,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { minutesSince } from '@/lib/format';
import { ORDER_TONES } from '@/lib/tones';

const PREP_CHOICES = [15, 20, 30, 45, 60];

export interface OrderCardActions {
  accept: (orderId: string, prepMinutes: number) => void;
  reject: (orderId: string) => void;
  cancel: (orderId: string) => void;
  assignRider: (orderId: string, riderId: string) => void;
  pickedUp: (orderId: string) => void;
  pay: (orderId: string) => void;
  printReceipt: (orderId: string) => void;
  riderStep: (orderId: string) => void;
}

/** One delivery or takeaway order with the next steps the logged-in role may take. */
export function OrderCard({
  view,
  role,
  riders,
  defaultPrep,
  now,
  busy,
  actions,
}: {
  view: OrderView;
  role: StaffRole;
  riders: StaffUser[];
  defaultPrep: number;
  now: number;
  busy: boolean;
  actions: OrderCardActions;
}) {
  const { order, names } = view;
  const [prep, setPrep] = useState(defaultPrep);
  const [riderId, setRiderId] = useState(order.riderId ?? riders[0]?.id ?? '');
  const due = Math.max(0, order.totals.total - order.paidTotal);
  const canCancel = availableActions(order.type, order.status, role).some((a) => a.to === 'CANCELLED');
  const channel = order.channel === 'CUSTOMER_APP' ? t('online.channelApp') : order.channel === 'PHONE' ? t('online.channelPhone') : t('online.channelCounter');
  const closed = ['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'].includes(order.status);

  return (
    <Card
      data-order-number={order.dailyNumber}
      className={cn(order.status === 'PLACED' && 'border-2 border-blue-400', order.status === 'READY' && 'border-2 border-green-400')}
    >
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-3xl font-black leading-none text-slate-900">#{order.dailyNumber}</p>
            <p className="mt-1 flex flex-wrap gap-1">
              <Badge tone={order.type === 'DELIVERY' ? 'blue' : 'grey'}>{t(`orderType.${order.type}`)}</Badge>
              <Badge>{channel}</Badge>
            </p>
          </div>
          <div className="text-right">
            <Badge tone={ORDER_TONES[order.status]} className="text-sm">
              {t(`orderStatus.${order.status}`)}
            </Badge>
            <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
              <Clock className="size-3.5" aria-hidden />
              {t('alerts.ago', { n: minutesSince(order.createdAt, now) })}
              {order.prepMinutes && !closed && ` · ${t('online.prep', { n: order.prepMinutes })}`}
            </p>
          </div>
        </div>

        <div className="text-sm">
          <p className="font-bold text-slate-900">{order.customerName}</p>
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 font-semibold text-brand">
              <Phone className="size-4" aria-hidden />
              {order.customerPhone}
            </a>
          )}
          {order.customerAddress && (
            <p className="flex items-start gap-1 text-slate-600">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {order.customerAddress}
            </p>
          )}
          {order.note && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-900">“{order.note}”</p>}
        </div>

        <ul className="space-y-0.5 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className={cn('flex justify-between gap-2', item.isVoid && 'text-slate-400 line-through')}>
              <span>
                <span className="font-semibold">
                  {formatQuantity(item.quantity, item.unit)} {item.name}
                </span>
                {item.variantName && ` (${item.variantName})`}
                {item.modifiers.map((m) => ` + ${m.name}`).join('')}
                {item.note && <span className="text-amber-700"> “{item.note}”</span>}
              </span>
              <span className="tabular-nums">{formatPaisa(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-100 pt-2">
          <span className="text-sm text-slate-600">
            {order.totals.deliveryFee > 0 && `${t('online.deliveryFee', { fee: formatPaisa(order.totals.deliveryFee) })} · `}
            {due === 0 && order.paidTotal > 0
              ? t('online.paid', { n: order.invoiceNumber ?? 0 })
              : order.type === 'DELIVERY'
                ? t('online.cod')
                : t('online.payAtCounter')}
          </span>
          <span className="text-xl font-black tabular-nums text-slate-900">{formatPaisa(order.totals.total)}</span>
        </div>

        {order.riderId && <p className="flex items-center gap-1 text-sm font-semibold text-slate-700"><Bike className="size-4" aria-hidden />{names[order.riderId]}</p>}
        {order.status === 'REJECTED' || order.status === 'CANCELLED' ? (
          <p className="text-sm text-red-700">{order.history.at(-1)?.reason}</p>
        ) : null}

        {/* Next steps */}
        {order.status === 'PLACED' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t('online.prepTime')}>
              <span className="text-xs font-bold text-slate-600">{t('online.prepTime')}</span>
              {PREP_CHOICES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={prep === m}
                  onClick={() => setPrep(m)}
                  className={cn('min-h-10 rounded-lg border-2 px-3 text-sm font-bold', prep === m ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200')}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" disabled={busy} onClick={() => actions.accept(order.id, prep)}>
                <Check className="size-5" aria-hidden />
                {t('online.accept')}
              </Button>
              <Button size="lg" variant="outline" disabled={busy} onClick={() => actions.reject(order.id)}>
                <X className="size-5" aria-hidden />
                {t('online.reject')}
              </Button>
            </div>
          </div>
        )}

        {order.status === 'READY' && order.type === 'DELIVERY' && (
          <div className="flex gap-2">
            <select
              value={riderId}
              onChange={(e) => setRiderId(e.target.value)}
              aria-label={t('online.rider')}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 px-3 font-semibold"
            >
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Button disabled={busy || !riderId} onClick={() => actions.assignRider(order.id, riderId)}>
              <Bike className="size-5" aria-hidden />
              {t('online.assignRider')}
            </Button>
          </div>
        )}
        {order.status === 'RIDER_ASSIGNED' && (
          <div className="flex gap-2">
            <select
              value={riderId}
              onChange={(e) => setRiderId(e.target.value)}
              aria-label={t('online.rider')}
              className="min-h-12 flex-1 rounded-xl border border-slate-300 px-3 font-semibold"
            >
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" disabled={busy || riderId === order.riderId} onClick={() => actions.assignRider(order.id, riderId)}>
              {t('online.changeRider')}
            </Button>
          </div>
        )}
        {(order.status === 'RIDER_ASSIGNED' || order.status === 'OUT_FOR_DELIVERY') && (
          <Button variant="outline" className="w-full border-amber-400 text-amber-800 hover:bg-amber-50" disabled={busy} onClick={() => actions.riderStep(order.id)}>
            {order.status === 'RIDER_ASSIGNED' ? t('online.demoPickedUp') : t('online.demoDelivered')}
          </Button>
        )}

        <div className="flex flex-wrap gap-2">
          {order.status === 'READY' && order.type === 'TAKEAWAY' && (
            <Button disabled={busy} onClick={() => actions.pickedUp(order.id)}>
              <PackageCheck className="size-5" aria-hidden />
              {t('online.pickedUp')}
            </Button>
          )}
          {order.type === 'TAKEAWAY' && due > 0 && !['PLACED', 'REJECTED', 'CANCELLED'].includes(order.status) && (
            <Button variant="secondary" disabled={busy} onClick={() => actions.pay(order.id)}>
              <Wallet className="size-5" aria-hidden />
              {t('pos.recordPayment')}
            </Button>
          )}
          {order.invoiceNumber !== null && (
            <Button variant="secondary" disabled={busy} onClick={() => actions.printReceipt(order.id)}>
              <Printer className="size-5" aria-hidden />
              {order.receiptPrints > 0 ? t('pos.reprintReceipt') : t('pos.printReceipt')}
            </Button>
          )}
          {canCancel && (
            <Button variant="ghost" className="text-red-700" disabled={busy} onClick={() => actions.cancel(order.id)}>
              {t('online.cancel')}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
