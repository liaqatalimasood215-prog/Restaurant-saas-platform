'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ChefHat, Users } from 'lucide-react';
import {
  formatQuantity,
  type KitchenStation,
  type KitchenTicket,
  type Order,
  type TableBoardEntry,
} from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { TICKET_TONES } from '@/lib/tones';
import { BillRequestControl } from './bill-request';

/**
 * Service Waiter (owner workflow 2026-10-28): sees only the assigned tables, the food that is ready
 * for them, marks it Served and calls the cashier. No menu, no ordering, no prices, no voids.
 */
export function ServiceWaiterScreen({ tableId }: { tableId?: string }) {
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const toast = useToast();
  // The pressed ticket stays disabled until it shows Served, so repeated taps do nothing.
  const [pending, setPending] = useState<string | null>(null);

  const header = (
    <ScreenHeader
      title={t('nav.serveFood')}
      status="DEMO_PROTOTYPE"
      description={t('service.description')}
      actions={
        tableId ? (
          <Link
            href="/waiter"
            className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('service.allMyTables')}
          </Link>
        ) : undefined
      }
    />
  );

  if ((floor.loading && !floor.data) || (menu.loading && !menu.data)) return (<>{header}<LoadingState /></>);
  if (!floor.data || !menu.data) {
    return (
      <>
        {header}
        <ErrorState message={(floor.error ?? menu.error)?.message} onRetry={() => (floor.reload(), menu.reload())} />
      </>
    );
  }

  const fail = (err: unknown) =>
    toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
  const serve = async (ticketId: string) => {
    setPending(ticketId);
    try {
      await getApi().updateTicket(ticketId, 'SERVED');
    } catch (err) {
      setPending(null);
      fail(err);
    }
  };
  const requestBill = async (orderId: string) => {
    try {
      await getApi().requestBill(orderId);
      toast.show({ tone: 'info', title: t('waiter.billRequested'), body: t('waiter.billRequestedBody') });
    } catch (err) {
      fail(err);
    }
  };

  const readyCount = (o: Order) => o.tickets.filter((tk) => tk.status === 'READY').length;
  const busyTables = floor.data.tables
    .filter((e): e is TableBoardEntry & { order: Order } => e.order !== null && (!tableId || e.table.id === tableId))
    .sort((a, b) => readyCount(b.order) - readyCount(a.order) || a.table.sort - b.table.sort);
  const myTables = floor.data.tables.map((e) => e.table.name).join(', ');

  return (
    <>
      {header}
      {!tableId && <p className="-mt-3 mb-4 text-sm font-semibold text-slate-700">{t('service.myTables', { tables: myTables })}</p>}
      {busyTables.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="size-10 text-green-600" aria-hidden />} title={t('service.nothing')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {busyTables.map((entry) => (
            <TableCard
              key={entry.table.id}
              entry={entry}
              stations={menu.data?.stations ?? []}
              pending={pending}
              onServe={serve}
              onRequestBill={requestBill}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TableCard({
  entry,
  stations,
  pending,
  onServe,
  onRequestBill,
}: {
  entry: TableBoardEntry & { order: Order };
  stations: KitchenStation[];
  pending: string | null;
  onServe: (ticketId: string) => void;
  onRequestBill: (orderId: string) => void;
}) {
  const { order } = entry;
  const cooking = (tk: KitchenTicket) => tk.status === 'NEW' || tk.status === 'PREPARING';
  const stationName = (id: string) => stations.find((s) => s.id === id)?.name ?? '';
  const itemsOf = (ticketId: string) => order.items.filter((i) => i.ticketId === ticketId && !i.isVoid);
  const ready = order.tickets.filter((tk) => tk.status === 'READY' && itemsOf(tk.id).length > 0);
  const inKitchen = order.tickets.filter((tk) => cooking(tk) && itemsOf(tk.id).length > 0);
  const served = order.tickets.filter((tk) => tk.status === 'SERVED').length;

  return (
    <Card className={cn(ready.length > 0 && 'border-2 border-green-400')}>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-5xl font-black leading-none text-slate-900">{entry.table.name}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <Users className="size-4" aria-hidden />
              {t('tables.guests', { n: order.guests ?? 0 })} · {t('waiter.orderNumber', { n: order.dailyNumber })}
            </p>
          </div>
          {ready.length > 0 ? (
            <Badge tone="green" className="text-sm">
              {t('service.readyCount', { n: ready.length })}
            </Badge>
          ) : (
            <Badge tone="grey">{t('service.noneReady')}</Badge>
          )}
        </div>

        {ready.map((ticket) => (
          <div key={ticket.id} className="rounded-2xl bg-green-50 p-3 ring-1 ring-green-200">
            <p className="mb-2 text-sm font-bold text-green-900">
              {t('service.readyFrom', { station: stationName(ticket.stationId) })}
            </p>
            <ul className="mb-3 space-y-1">
              {itemsOf(ticket.id).map((item) => (
                <li key={item.id} className="text-xl font-extrabold leading-snug text-slate-900">
                  {formatQuantity(item.quantity, item.unit)} {item.name}
                  {item.variantName && <span className="font-semibold"> ({item.variantName})</span>}
                  {item.note && <span className="block text-sm font-bold text-amber-800">“{item.note}”</span>}
                </li>
              ))}
            </ul>
            <Button size="lg" className="w-full bg-green-600 text-lg hover:bg-green-700" disabled={pending === ticket.id} onClick={() => onServe(ticket.id)}>
              <CheckCircle2 className="size-6" aria-hidden />
              {t('waiter.served')}
            </Button>
          </div>
        ))}

        {inKitchen.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ChefHat className="size-4" aria-hidden />
              {t('service.stillCooking')}
            </p>
            <ul className="space-y-1 text-sm">
              {inKitchen.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold">{stationName(ticket.stationId)}:</span>{' '}
                    {itemsOf(ticket.id)
                      .map((i) => `${formatQuantity(i.quantity, i.unit)} ${i.name}`)
                      .join(', ')}
                  </span>
                  <Badge tone={TICKET_TONES[ticket.status]}>{t(`ticketStatus.${ticket.status}`)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        {served > 0 && <p className="text-xs text-slate-500">{t('service.servedCount', { n: served })}</p>}

        <BillRequestControl order={order} busy={false} onRequest={onRequestBill} />
      </CardBody>
    </Card>
  );
}
