'use client';

import { useState } from 'react';
import { BellRing, Pause, Plus, Search } from 'lucide-react';
import { formatPaisa, type MenuItem, type OrderView, type TableBoardEntry } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { useNotifications } from '@/components/shell/notifications';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { addToCart, type CartLine } from '../waiter/cart';
import { ItemDialog } from '../waiter/item-dialog';
import { CurrentBill } from './current-bill';
import { newDraft, type Draft } from './draft';
import { MenuPanel } from './menu-panel';

/** "1", "t1", "T1" → "T1" */
function normalizeTable(input: string): string {
  const value = input.trim().toUpperCase();
  return /^\d+$/.test(value) ? `T${value}` : value;
}

type OpenEntry = TableBoardEntry & { order: NonNullable<TableBoardEntry['order']> };

/**
 * POS / New Bill (owner request 2026-10-28). Flow A: the cashier makes a new dine-in, takeaway or
 * delivery bill and sends it to the kitchen. Flow B: the cashier opens a waiter's running table bill
 * and takes payment. Both use the same order records as Waiter, Kitchen, Tables and Orders.
 */
export function PosScreen({ tableId }: { tableId?: string }) {
  const { data: session } = useSession();
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const counter = useApiQuery(() => getApi().listCounterOrders(), []);
  const held = useApiQuery(() => getApi().listHeldBills(), []);
  const notifications = useNotifications();
  const toast = useToast();
  const [draft, setDraftState] = useState<Draft>(() => newDraft());
  const [picking, setPicking] = useState<{ item: MenuItem; line: CartLine | null } | null>(null);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [initialTable, setInitialTable] = useState(tableId);

  const header = (
    <ScreenHeader
      title={t('nav.pos')}
      status="DEMO_PROTOTYPE"
      description={t('pos.description')}
      actions={
        <Button size="lg" onClick={() => setDraftState(newDraft())}>
          <Plus className="size-5" aria-hidden />
          {t('pos.newBill')}
        </Button>
      }
    />
  );

  if ((floor.loading && !floor.data) || (menu.loading && !menu.data) || (counter.loading && !counter.data) || (held.loading && !held.data)) {
    return (<>{header}<LoadingState /></>);
  }
  if (!floor.data || !menu.data || !counter.data || !held.data || !session) {
    return (
      <>
        {header}
        <ErrorState
          message={(floor.error ?? menu.error ?? counter.error ?? held.error)?.message}
          onRetry={() => (floor.reload(), menu.reload(), counter.reload(), held.reload())}
        />
      </>
    );
  }

  const tables = floor.data.tables;
  const openTables = tables.filter((e): e is OpenEntry => e.order !== null);
  const openTable = (entry: TableBoardEntry) => setDraftState({ ...newDraft('DINE_IN'), tableId: entry.table.id, orderId: entry.order?.id ?? null });
  // Opened from a notification link (/pos?table=…): open that table's bill once.
  if (initialTable) {
    const entry = tables.find((e) => e.table.id === initialTable);
    setInitialTable(undefined);
    if (entry) openTable(entry);
  }

  const findTable = async () => {
    const name = normalizeTable(search);
    // Ask for the latest bills: the waiter may have sent the order a moment ago.
    let latest = tables;
    try {
      latest = (await getApi().getFloorPlan()).tables;
    } catch {
      // fall back to what is on screen
    }
    const entry = latest.find((e) => e.table.name.toUpperCase() === name);
    if (!entry) return setSearchError(t('pos.tableNotFound', { table: name || '—' }));
    if (!entry.order) return setSearchError(t('pos.tableFree', { table: entry.table.name }));
    setSearchError(null);
    setSearch('');
    openTable(entry);
  };

  const unpaidCounter = counter.data.filter(
    (v: OrderView) =>
      v.order.channel !== 'CUSTOMER_APP' &&
      !['REJECTED', 'CANCELLED'].includes(v.order.status) &&
      v.order.totals.total - v.order.paidTotal > 0,
  );
  const requests = notifications.filter((n) => n.kind === 'BILL_REQUESTED');
  const accept = async (orderId: string) => {
    try {
      await getApi().acceptBillRequest(orderId);
      toast.show({ tone: 'success', title: t('pos.accepted') });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };
  const chip = (active: boolean) =>
    cn('flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold', active ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white hover:bg-slate-50');

  return (
    <>
      {header}

      <Card className="mb-4">
        <CardBody className="space-y-3">
          {requests.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-2">
              <span className="flex items-center gap-1 text-sm font-bold text-amber-900">
                <BellRing className="size-5" aria-hidden />
                {t('pos.billRequests')}
              </span>
              {requests.map((n) =>
                n.kind === 'BILL_REQUESTED' ? (
                  <span key={n.id} className="flex items-center gap-1 rounded-xl bg-white p-1 pl-3 text-sm shadow-sm">
                    <span className="font-bold">{t('alerts.billRequested', { table: n.tableName })}</span>
                    <span className="text-slate-500">· {formatPaisa(n.total)}</span>
                    <Button
                      variant="ghost"
                      className="min-h-10 px-2"
                      onClick={() => {
                        const entry = tables.find((e) => e.table.id === n.tableId);
                        if (entry) openTable(entry);
                      }}
                    >
                      {t('pos.open')}
                    </Button>
                    <Button className="min-h-10 px-3" onClick={() => accept(n.orderId)}>
                      {t('pos.accept')}
                    </Button>
                  </span>
                ) : null,
              )}
            </div>
          )}

          <div className="flex flex-wrap items-start gap-4">
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-sm font-bold text-slate-900" htmlFor="pos-table">
                {t('pos.findTable')}
              </label>
              <div className="flex gap-2">
                <input
                  id="pos-table"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void findTable()}
                  placeholder={t('pos.findTablePlaceholder')}
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-lg font-bold"
                />
                <Button onClick={findTable} aria-label={t('pos.findTable')} className="min-h-11">
                  <Search className="size-5" aria-hidden />
                </Button>
              </div>
              {searchError && (
                <p role="alert" className="mt-1 text-sm font-semibold text-red-700">
                  {searchError}
                </p>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-bold text-slate-900">
                {t('pos.openBills')} <span className="text-slate-500">({openTables.length})</span>
              </p>
              {openTables.length === 0 ? (
                <p className="text-sm text-slate-500">{t('pos.noOpenBills')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {openTables.map((entry) => (
                    <button key={entry.table.id} type="button" onClick={() => openTable(entry)} className={chip(draft.orderId === entry.order.id)}>
                      <span className="text-base font-black">{entry.table.name}</span>
                      <span className={cn('text-xs', entry.status === 'BILL_REQUESTED' ? 'text-amber-700' : 'text-slate-500')}>
                        {t(`tableStatus.${entry.status}`)}
                      </span>
                      <span className="tabular-nums">{formatPaisa(entry.order.totals.total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(unpaidCounter.length > 0 || held.data.length > 0) && (
            <div className="flex flex-wrap gap-4">
              {unpaidCounter.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-bold text-slate-900">{t('pos.runningCounter')}</p>
                  <div className="flex flex-wrap gap-2">
                    {unpaidCounter.map(({ order }) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setDraftState({ ...newDraft(order.type), orderId: order.id })}
                        className={chip(draft.orderId === order.id)}
                      >
                        #{order.dailyNumber} · {t(`orderType.${order.type}`)}
                        <span className="tabular-nums">{formatPaisa(order.totals.total - order.paidTotal)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {held.data.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 text-sm font-bold text-slate-900">
                    <Pause className="size-4" aria-hidden />
                    {t('pos.heldBills')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {held.data.map((h) => {
                      const entry = tables.find((e) => e.table.id === h.tableId);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() =>
                            setDraftState({
                              ...newDraft(h.type),
                              tableId: h.tableId,
                              guests: h.guests ?? 1,
                              orderId: entry?.order?.id ?? null,
                              customer: { name: h.customerName, phone: h.customerPhone, address: h.customerAddress },
                              note: h.note,
                              cart: h.items.map((i) => ({ ...i, key: crypto.randomUUID() })),
                              heldId: h.id,
                            })
                          }
                          className={chip(draft.heldId === h.id)}
                        >
                          {entry?.table.name ?? (h.customerName || t(`orderType.${h.type}`))} · {t(`orderType.${h.type}`)} ·{' '}
                          {t('pos.itemCount', { n: h.items.length })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_27rem]">
        <MenuPanel menu={menu.data} onPick={(item) => setPicking({ item, line: null })} />
        <CurrentBill
          key={`${draft.orderId ?? 'new'}-${draft.heldId ?? ''}`}
          draft={draft}
          setDraft={setDraftState}
          menu={menu.data}
          tables={tables}
          session={session}
          onEditLine={(line) => {
            const item = menu.data?.items.find((i) => i.id === line.menuItemId);
            if (item) setPicking({ item, line });
          }}
          onNewBill={() => setDraftState(newDraft())}
        />
      </div>

      {picking && (
        <ItemDialog
          item={picking.item}
          menu={menu.data}
          initial={picking.line ?? undefined}
          onClose={() => setPicking(null)}
          onAdd={(item) => {
            const editing = picking.line;
            setDraftState((d) => ({
              ...d,
              cart: editing ? d.cart.map((l) => (l.key === editing.key ? { ...item, key: l.key } : l)) : addToCart(d.cart, item),
            }));
            setPicking(null);
          }}
        />
      )}
    </>
  );
}
