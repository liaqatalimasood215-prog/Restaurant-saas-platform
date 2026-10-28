'use client';

import { useState } from 'react';
import { BellRing, ChevronDown, ListOrdered, Pause, Plus, Search } from 'lucide-react';
import { formatPaisa, type MenuItem, type OrderView, type TableBoardEntry } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { useNotifications } from '@/components/shell/notifications';
import { Button } from '@/components/ui/button';
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
 * "Find a bill by table number" and "Running bills" sit in the title row so the menu and the bill
 * start high on the screen.
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
  const [showBills, setShowBills] = useState(false);
  const [initialTable, setInitialTable] = useState(tableId);

  const startNewBill = () => setDraftState(newDraft());
  const title = <ScreenHeader title={t('nav.pos')} status="DEMO_PROTOTYPE" compact />;

  if ((floor.loading && !floor.data) || (menu.loading && !menu.data) || (counter.loading && !counter.data) || (held.loading && !held.data)) {
    return (<>{title}<LoadingState /></>);
  }
  if (!floor.data || !menu.data || !counter.data || !held.data || !session) {
    return (
      <>
        {title}
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
  const runningCount = openTables.length + unpaidCounter.length + held.data.length;
  const requests = notifications.filter((n) => n.kind === 'BILL_REQUESTED');
  const accept = async (orderId: string) => {
    try {
      await getApi().acceptBillRequest(orderId);
      toast.show({ tone: 'success', title: t('pos.accepted') });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };
  /** Open a bill picked from the Running bills list and close the list */
  const choose = (next: Draft) => {
    setDraftState(next);
    setShowBills(false);
  };
  const chip = (active: boolean) =>
    cn('flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold', active ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white hover:bg-slate-50');
  const listTitle = 'mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500';

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <div className="flex">
          <label htmlFor="pos-table" className="sr-only">
            {t('pos.findTable')}
          </label>
          <input
            id="pos-table"
            value={search}
            onChange={(e) => (setSearch(e.target.value), setSearchError(null))}
            onKeyDown={(e) => e.key === 'Enter' && void findTable()}
            placeholder={t('pos.findTableShort')}
            inputMode="numeric"
            className="min-h-11 w-44 rounded-l-xl border border-r-0 border-slate-300 bg-white px-3 text-sm font-bold"
          />
          <button
            type="button"
            onClick={findTable}
            aria-label={t('pos.findTable')}
            className="flex min-h-11 items-center justify-center rounded-r-xl bg-navy px-3 text-white hover:bg-slate-800"
          >
            <Search className="size-5" aria-hidden />
          </button>
        </div>
        {searchError && (
          <p role="alert" className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-red-200 bg-white p-2 text-xs font-semibold text-red-700 shadow-md">
            {searchError}
          </p>
        )}
      </div>

      <div className="relative" onKeyDown={(e) => e.key === 'Escape' && setShowBills(false)}>
        <button
          type="button"
          aria-expanded={showBills}
          onClick={() => setShowBills((v) => !v)}
          className={cn(
            'flex min-h-11 items-center gap-2 rounded-xl border bg-white px-3 text-sm font-bold text-slate-800 hover:bg-slate-50',
            showBills ? 'border-brand' : 'border-slate-200',
          )}
        >
          <ListOrdered className="size-5" aria-hidden />
          {t('pos.runningBills')}
          <span className={cn('rounded-full px-2 text-xs tabular-nums', runningCount > 0 ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500')}>{runningCount}</span>
          <ChevronDown className="size-4 text-slate-400" aria-hidden />
        </button>
        {showBills && (
          <>
            <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 z-20 cursor-default" onClick={() => setShowBills(false)} />
            <div className="absolute right-0 top-full z-30 mt-2 max-h-[70dvh] w-[min(92vw,30rem)] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <section>
                <p className={listTitle}>
                  {t('pos.openBills')} ({openTables.length})
                </p>
                {openTables.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('pos.noOpenBills')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {openTables.map((entry) => (
                      <button
                        key={entry.table.id}
                        type="button"
                        onClick={() => choose({ ...newDraft('DINE_IN'), tableId: entry.table.id, orderId: entry.order.id })}
                        className={chip(draft.orderId === entry.order.id)}
                      >
                        <span className="text-base font-black">{entry.table.name}</span>
                        <span className={cn('text-xs', entry.status === 'BILL_REQUESTED' ? 'text-amber-700' : 'text-slate-500')}>
                          {t(`tableStatus.${entry.status}`)}
                        </span>
                        <span className="tabular-nums">{formatPaisa(entry.order.totals.total)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
              {unpaidCounter.length > 0 && (
                <section>
                  <p className={listTitle}>{t('pos.runningCounter')}</p>
                  <div className="flex flex-wrap gap-2">
                    {unpaidCounter.map(({ order }) => (
                      <button key={order.id} type="button" onClick={() => choose({ ...newDraft(order.type), orderId: order.id })} className={chip(draft.orderId === order.id)}>
                        #{order.dailyNumber} · {t(`orderType.${order.type}`)}
                        <span className="tabular-nums">{formatPaisa(order.totals.total - order.paidTotal)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {held.data.length > 0 && (
                <section>
                  <p className={listTitle}>
                    <Pause className="size-3.5" aria-hidden />
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
                            choose({
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
                </section>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={startNewBill}
        className="flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-dark"
      >
        <Plus className="size-5" aria-hidden />
        {t('pos.newBill')}
      </button>
    </div>
  );

  return (
    // Tablet and desktop: exactly one screen high (below the 4rem header and the main padding), so
    // products scroll on their own and the bill's totals and actions are always visible.
    <div className="lg:flex lg:h-[calc(100dvh-6.5rem)] lg:flex-col lg:short:h-[calc(100dvh-5.5rem)]">
      <ScreenHeader title={t('nav.pos')} status="DEMO_PROTOTYPE" description={t('pos.description')} compact actions={actions} />

      {requests.length > 0 && (
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-2">
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

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_26rem] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_28rem]">
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
          onNewBill={startNewBill}
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
    </div>
  );
}
