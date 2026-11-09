'use client';

import { useState, type ReactNode } from 'react';
import { BellRing, Bike, FlaskConical, Phone, ShoppingBag } from 'lucide-react';
import { formatPaisa, isRiderOnline, riderAssignBlock, type Order, type OrderStatus, type OrderView } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ReasonDialog } from '@/components/ui/reason-dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useNow } from '@/lib/hooks/use-now';
import { useSession } from '@/lib/session';
import { ORDER_TONES } from '@/lib/tones';
import { PaymentDialog } from '../pos/payment-dialog';
import { PrintDialog } from '../pos/print-dialog';
import { CancelOrderDialog } from './cancel-order-dialog';
import { CounterOrderDialog } from './counter-order-dialog';
import { OrderCard, type OrderCardActions } from './order-card';
import { newId } from '@/lib/new-id';

const SECTIONS: { key: 'new' | 'kitchen' | 'ready' | 'rider'; statuses: OrderStatus[] }[] = [
  { key: 'new', statuses: ['PLACED'] },
  { key: 'kitchen', statuses: ['ACCEPTED', 'PREPARING'] },
  { key: 'ready', statuses: ['READY'] },
  { key: 'rider', statuses: ['RIDER_ASSIGNED', 'OUT_FOR_DELIVERY'] },
];
const DONE: OrderStatus[] = ['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'];

/**
 * Online Orders (MASTER_PROMPT.md §5.2–§5.4, §7.1 Cashier / POS — online): customer orders with a
 * repeating alarm, accept with prep time or reject, phone delivery and takeaway orders, riders and
 * rider cash. Customer and rider steps can also be done with DEMO buttons until the backend joins the apps (Phase 4).
 */
export function OnlineOrdersScreen() {
  const { data: session } = useSession();
  const orders = useApiQuery(() => getApi().listCounterOrders(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const riderCash = useApiQuery(() => getApi().listRiderCash(), []);
  const toast = useToast();
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [newOrder, setNewOrder] = useState<'TAKEAWAY' | 'DELIVERY' | null>(null);
  const [reasonFor, setReasonFor] = useState<{ orderId: string; action: 'reject' | 'cancel' } | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [printing, setPrinting] = useState<{ order: Order; duplicate: boolean } | null>(null);
  const [settleKeys, setSettleKeys] = useState<Record<string, string>>({});

  const run = async <T,>(action: () => Promise<T>, success?: (result: T) => string) => {
    setBusy(true);
    try {
      const result = await action();
      if (success) toast.show({ tone: 'success', title: success(result) });
      return result;
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const findOrder = (id: string) => orders.data?.find((v) => v.order.id === id)?.order;

  const actions: OrderCardActions = {
    accept: (id, prep) => void run(() => getApi().acceptOnlineOrder(id, prep), (o) => t('online.accepted', { n: o.dailyNumber })),
    reject: (id) => setReasonFor({ orderId: id, action: 'reject' }),
    cancel: (id) => setReasonFor({ orderId: id, action: 'cancel' }),
    assignRider: (id, riderId) => void run(() => getApi().assignRider(id, riderId), (o) => t('online.riderAssigned', { n: o.dailyNumber })),
    pickedUp: (id) => void run(() => getApi().markPickedUp(id), (o) => t('online.handedOver', { n: o.dailyNumber })),
    pay: (id) => setPaying(findOrder(id) ?? null),
    printReceipt: (id) =>
      void run(() => getApi().printReceipt(id)).then((o) => o && setPrinting({ order: o, duplicate: o.receiptPrints > 1 })),
    riderStep: (id) => void run(() => getDemoControls().simulateRiderStep(id), (o) => t(`orderStatus.${o.status}`)),
  };

  const header = (
    <ScreenHeader
      title={t('nav.online-orders')}
      status="DEMO_PROTOTYPE"
      description={t('online.description')}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setNewOrder('TAKEAWAY')} disabled={!menu.data}>
            <ShoppingBag className="size-5" aria-hidden />
            {t('online.newTakeaway')}
          </Button>
          <Button variant="outline" onClick={() => setNewOrder('DELIVERY')} disabled={!menu.data}>
            <Phone className="size-5" aria-hidden />
            {t('online.newPhone')}
          </Button>
        </div>
      }
    />
  );

  if ((orders.loading && !orders.data) || (menu.loading && !menu.data) || (riderCash.loading && !riderCash.data)) {
    return (<>{header}<LoadingState /></>);
  }
  if (!orders.data || !menu.data || !riderCash.data || !session) {
    return (
      <>
        {header}
        <ErrorState
          message={(orders.error ?? menu.error ?? riderCash.error)?.message}
          onRetry={() => (orders.reload(), menu.reload(), riderCash.reload())}
        />
      </>
    );
  }

  // A new order goes only to a rider who may take it: active, activated and Online.
  const riders = riderCash.data.map((r) => r.rider).filter((r) => riderAssignBlock(r) === null);
  const byStatus = (statuses: OrderStatus[]) => orders.data?.filter((v) => statuses.includes(v.order.status)) ?? [];
  const done = byStatus(DONE).reverse();
  const card = (view: OrderView) => (
    <OrderCard
      key={view.order.id}
      view={view}
      role={session.user.role}
      riders={riders}
      defaultPrep={session.branch.defaultPrepMinutes}
      now={now}
      busy={busy}
      actions={actions}
    />
  );

  return (
    <>
      {header}

      <Card className="mb-4 border-amber-200 bg-amber-50/60">
        <CardBody className="flex flex-wrap items-center gap-2 text-sm">
          <FlaskConical className="size-5 text-amber-700" aria-hidden />
          <span className="font-semibold text-amber-900">{t('online.demoBar')}</span>
          <Button variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100" disabled={busy}
            onClick={() => run(() => getDemoControls().simulateCustomerOrder('DELIVERY'))}>
            {t('online.demoDelivery')}
          </Button>
          <Button variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100" disabled={busy}
            onClick={() => run(() => getDemoControls().simulateCustomerOrder('TAKEAWAY'))}>
            {t('online.demoPickup')}
          </Button>
          <span className="ml-auto text-xs text-slate-600">
            {session.branch.onlineOrdersEnabled ? t('online.acceptingOn') : t('online.acceptingOff')}
          </span>
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const list = byStatus(section.statuses);
            return (
              <Section key={section.key} title={t(`online.section_${section.key}`)} count={list.length} alarm={section.key === 'new' && list.length > 0}>
                {list.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">{t('online.none')}</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">{list.map(card)}</div>
                )}
              </Section>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="size-5" aria-hidden />
                {t('online.riderCash')}
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {riderCash.data.map((r) => (
                <div key={r.rider.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="flex items-center justify-between gap-2 font-bold text-slate-900">
                    {r.rider.name}
                    {!isRiderOnline(r.rider) && <Badge>{t('online.riderOffline')}</Badge>}
                  </p>
                  <p className="text-xs text-slate-600">{t('online.activeDeliveries', { n: r.activeDeliveries })}</p>
                  <p className="mt-1 flex justify-between text-sm">
                    <span>{t('online.cashToSettle')}</span>
                    <span className="font-black">{formatPaisa(r.cashToSettle)}</span>
                  </p>
                  <Button
                    className="mt-2 w-full"
                    variant="secondary"
                    disabled={busy || r.cashToSettle === 0}
                    onClick={() => {
                      const key = settleKeys[r.rider.id] ?? newId();
                      setSettleKeys((k) => ({ ...k, [r.rider.id]: key }));
                      void run(() => getApi().settleRiderCash(r.rider.id, key), (s) => t('online.settled', { amount: formatPaisa(s.amount), name: r.rider.name })).then(
                        (s) => s && setSettleKeys((k) => ({ ...k, [r.rider.id]: newId() })),
                      );
                    }}
                  >
                    {t('online.settle')}
                  </Button>
                </div>
              ))}
              <p className="text-xs text-slate-500">{t('online.riderNote')}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('online.doneToday')}</CardTitle>
              <Badge>{done.length}</Badge>
            </CardHeader>
            <CardBody>
              {done.length === 0 ? (
                <EmptyState title={t('online.none')} />
              ) : (
                <ul className="space-y-2 text-sm">
                  {done.map(({ order }) => (
                    <li key={order.id} className="flex items-center justify-between gap-2">
                      <span className="font-bold">#{order.dailyNumber}</span>
                      <span className="truncate text-slate-600">{order.customerName || t('pos.walkIn')}</span>
                      <Badge tone={ORDER_TONES[order.status]}>{t(`orderStatus.${order.status}`)}</Badge>
                      <span className="tabular-nums">{formatPaisa(order.totals.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      {newOrder && (
        <CounterOrderDialog
          type={newOrder}
          menu={menu.data}
          deliveryFee={session.branch.deliveryFee}
          onClose={() => setNewOrder(null)}
          onCreated={(o) => {
            setNewOrder(null);
            toast.show({ tone: 'success', title: t('online.created', { n: o.dailyNumber }) });
          }}
        />
      )}
      {reasonFor?.action === 'reject' && (
        <ReasonDialog
          title={t('online.rejectTitle')}
          body={t('online.rejectBody')}
          confirmLabel={t('online.reject')}
          onClose={() => setReasonFor(null)}
          onConfirm={(reason) => {
            const { orderId } = reasonFor;
            setReasonFor(null);
            void run(() => getApi().rejectOnlineOrder(orderId, reason));
          }}
        />
      )}
      {/* I4: food already made gets its outcome: kept for another order, back to stock, or wastage (owner, 2026-11-09) */}
      {reasonFor?.action === 'cancel' && (
        <CancelOrderDialog
          orderId={reasonFor.orderId}
          onClose={() => setReasonFor(null)}
          onConfirm={(reason, food) => {
            const { orderId } = reasonFor;
            setReasonFor(null);
            void run(() => getApi().cancelOrder(orderId, reason, food));
          }}
        />
      )}
      {paying && (
        <PaymentDialog
          order={paying}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            toast.show({ tone: 'success', title: t('pos.paymentRecorded') });
          }}
        />
      )}
      {printing && (
        <PrintDialog
          order={printing.order}
          kind={printing.duplicate ? 'DUPLICATE' : 'RECEIPT'}
          placeLabel={t(`orderType.${printing.order.type}`)}
          waiterName={null}
          onClose={() => setPrinting(null)}
        />
      )}
    </>
  );
}

function Section({ title, count, alarm, children }: { title: string; count: number; alarm: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold text-slate-900">
        {alarm && <BellRing className="size-5 animate-pulse text-brand" aria-hidden />}
        {title}
        <span className="text-slate-500">{count}</span>
      </h2>
      {children}
    </section>
  );
}
