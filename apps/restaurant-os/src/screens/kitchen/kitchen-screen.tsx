'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, ChefHat, CircleCheck, CookingPot, Maximize, Minimize, PackageX, Trash2, Volume2, VolumeX } from 'lucide-react';
import { WASTE_REASONS, kdsState, type KitchenStation, type KitchenTicketView, type TicketStatus } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useNow } from '@/lib/hooks/use-now';
import { useSession } from '@/lib/session';
import { playTone, speak, unlockSound } from '@/lib/sound';
import { ReportWasteDialog } from './report-waste';
import { TicketCard } from './ticket-card';

const ALL = 'ALL';
const STATION_KEY = 'lala-os-kds-station';
/** Three columns with the owner's colours (2026-11-08): New red, Preparing amber, Ready green. */
const COLUMNS = [
  { status: 'NEW', label: 'kitchen.columnNew', icon: Bell, bar: 'bg-brand-gradient' },
  { status: 'PREPARING', label: 'kitchen.columnPreparing', icon: CookingPot, bar: 'bg-amber-500' },
  { status: 'READY', label: 'kitchen.columnReady', icon: CircleCheck, bar: 'bg-green-600' },
] as const;

/** Each kitchen tablet remembers its own station. */
function readStoredStation(): string {
  try {
    return window.localStorage.getItem(STATION_KEY) ?? ALL;
  } catch {
    return ALL;
  }
}

/** Kitchen Display by station (MASTER_PROMPT.md §5.1 steps 4–5, §7.1 Kitchen Display). Tablet first. */
export function KitchenScreen() {
  const { data: session, allowed } = useSession();
  const tickets = useApiQuery(() => getApi().listKitchenTickets(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const [stationId, setStationId] = useState(readStoredStation);
  const [soundOn, setSoundOn] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  /** W4: Report waste for approval */
  const [reporting, setReporting] = useState(false);
  // I4: ready food given to a line (after the safety check), and a cancelled ticket being stopped
  const [giving, setGiving] = useState<{ view: KitchenTicketView; itemId: string; foodId: string } | null>(null);
  const [stopping, setStopping] = useState<string | null>(null);
  // The pressed ticket stays disabled until it shows its new status, so a double tap does nothing.
  const [pending, setPending] = useState<{ ticketId: string; from: TicketStatus } | null>(null);
  const seenNew = useRef<Set<string> | null>(null);
  const now = useNow(1000);
  const toast = useToast();

  const user = session?.user;
  const stations = (menu.data?.stations ?? []).filter(
    (s) => !user || user.role !== 'KITCHEN' || user.stationIds.length === 0 || user.stationIds.includes(s.id),
  );
  const selected = stations.some((s) => s.id === stationId) ? stationId : ALL;
  // A picked-up card hides 5 minutes after the pickup, right on time (owner, 2026-11-09)
  const visible = (tickets.data ?? []).filter((v) => (selected === ALL || v.ticket.stationId === selected) && kdsState(v.pickup ?? null, now) !== 'HIDDEN');

  // New-ticket sound (browsers allow it only after "Tap to enable sound").
  useEffect(() => {
    if (!tickets.data) return;
    const newIds = tickets.data.filter((v) => v.ticket.status === 'NEW').map((v) => v.ticket.id);
    if (seenNew.current === null) {
      seenNew.current = new Set(newIds);
      return;
    }
    const fresh = newIds.filter((id) => !seenNew.current?.has(id));
    fresh.forEach((id) => seenNew.current?.add(id));
    if (fresh.length > 0 && soundOn) {
      playTone('TICKET');
      speak({ roman: t('alerts.speech.newTicket.roman'), urdu: t('alerts.speech.newTicket.urdu'), hindi: t('alerts.speech.newTicket.hindi') });
    }
  }, [tickets.data, soundOn]);

  const chooseStation = (id: string) => {
    setStationId(id);
    try {
      window.localStorage.setItem(STATION_KEY, id);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  };

  const enableSound = () => {
    setSoundOn(unlockSound());
    // Keep the kitchen screen awake where the browser supports it.
    void navigator.wakeLock?.request('screen').catch(() => undefined);
  };

  const move = async (ticketId: string, from: TicketStatus, to: TicketStatus) => {
    setPending({ ticketId, from });
    try {
      await getApi().updateTicket(ticketId, to);
    } catch (err) {
      setPending(null);
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  const attempt = async (call: () => Promise<void>) => {
    try {
      await call();
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  const undoPickup = async (ticketId: string) => {
    try {
      await getApi().undoPickup(ticketId);
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  // Full screen (owner, 2026-11-09): tap to enter, tap again to leave; the sidebar and top bar fold away (globals.css). Android
  // tablets are asked to stay in landscape; a browser that refuses gets a clear message.
  const fullScreen = useFullScreen();
  const toggleFullScreen = async () => {
    if (fullScreen) {
      await document.exitFullscreen?.().catch(() => undefined);
      return;
    }
    try {
      if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) throw new Error('unsupported');
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => undefined);
    } catch {
      toast.show({ tone: 'info', title: t('kitchen.fullScreenBlocked'), body: t('kitchen.fullScreenTip') });
    }
  };
  const clock = new Date(now);
  const roundButton = 'press grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white hover:bg-white/25';

  // Red title bar of the owner's picture (2026-11-08): name, sound, out of stock, full screen and the time
  const header = (
    <div className="bg-brand-gradient mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl px-3 py-1.5 text-white shadow-brand">
      <ChefHat className="size-7 shrink-0" aria-hidden />
      <div className="mr-auto min-w-0">
        <h1 className="text-lg leading-tight font-extrabold">{t('kitchen.title')}</h1>
        <p className="hidden text-xs text-white/85 xl:block">{t('kitchen.subtitle')}</p>
      </div>
      <button type="button" onClick={enableSound} className="press flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-bold text-brand shadow-sm">
        {soundOn ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
        {soundOn ? t('kitchen.soundOn') : t('kitchen.enableSound')}
      </button>
      {user && allowed('item.outOfStock') && (
        <button type="button" onClick={() => setStockOpen(true)} disabled={!menu.data} className="press flex min-h-10 items-center gap-2 rounded-xl bg-white/15 px-3 text-sm font-bold text-white hover:bg-white/25 disabled:opacity-60">
          <PackageX className="size-5" aria-hidden />
          {t('kitchen.outOfStock')}
        </button>
      )}
      {user && allowed('inventory.waste.submit') && (
        <button type="button" onClick={() => setReporting(true)} className="press flex min-h-10 items-center gap-2 rounded-xl bg-white/15 px-3 text-sm font-bold text-white hover:bg-white/25" data-report-waste-button>
          <Trash2 className="size-5" aria-hidden />
          {t('kitchen.reportWaste')}
        </button>
      )}
      <button
        type="button"
        onClick={() => void toggleFullScreen()}
        aria-label={fullScreen ? t('kitchen.exitFullScreen') : t('kitchen.fullScreen')}
        aria-pressed={fullScreen}
        title={fullScreen ? t('kitchen.exitFullScreen') : t('kitchen.fullScreen')}
        className={roundButton}
        data-fullscreen-toggle
      >
        {fullScreen ? <Minimize className="size-5" aria-hidden /> : <Maximize className="size-5" aria-hidden />}
      </button>
      <p className="text-right leading-tight tabular-nums" suppressHydrationWarning>
        <span className="block text-base font-black">{clock.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}</span>
        <span className="block text-xs text-white/85">{clock.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      </p>
    </div>
  );

  if ((tickets.loading && !tickets.data) || (menu.loading && !menu.data)) return (<>{header}<LoadingState /></>);
  if (!tickets.data || !menu.data) {
    return (
      <>
        {header}
        <ErrorState message={(tickets.error ?? menu.error)?.message} onRetry={() => (tickets.reload(), menu.reload())} />
      </>
    );
  }

  return (
    <>
      {header}
      {(tickets.error ?? menu.error) && (
        <ErrorState message={(tickets.error ?? menu.error)?.message} onRetry={() => (tickets.reload(), menu.reload())} />
      )}

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {[{ id: ALL, name: t('kitchen.allStations') }, ...stations].map((s) => {
          const count = (tickets.data ?? []).filter(
            (v) => v.ticket.status !== 'READY' && (s.id === ALL || v.ticket.stationId === s.id),
          ).length;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected === s.id}
              onClick={() => chooseStation(s.id)}
              className={cn(
                'press flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[15px] font-bold',
                selected === s.id ? 'bg-brand-gradient text-white shadow-brand' : 'border border-slate-200 bg-white text-slate-800 shadow-sm',
              )}
            >
              {s.name}
              {count > 0 && <span className={cn('min-w-6 rounded-full px-1.5 text-center text-xs font-black', selected === s.id ? 'bg-white text-brand' : 'bg-brand text-white')}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        {COLUMNS.map((column) => {
          // Ready also holds food served in the last 5 minutes; cards still waiting at the pass come first, picked-up ones last
          const columnTickets = visible
            .filter((v) => v.ticket.status === column.status || (column.status === 'READY' && v.ticket.status === 'SERVED'))
            .sort((a, b) => Number(Boolean(a.pickup)) - Number(Boolean(b.pickup)));
          return (
            <section key={column.status} aria-label={t(column.label)} className="min-w-0">
              <h2 className={cn('mb-1.5 flex min-h-10 items-center gap-2 rounded-xl px-3 text-base font-extrabold text-white shadow-sm', column.bar)}>
                <column.icon className="size-5" aria-hidden />
                {t(column.label)}
                <span className="ml-auto min-w-7 rounded-full bg-white px-2 text-center text-sm font-black text-slate-900 tabular-nums">{columnTickets.length}</span>
              </h2>
              {columnTickets.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                  {t('kitchen.empty')}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {columnTickets.map((v) => (
                    <TicketCard
                      key={v.ticket.id}
                      view={v}
                      station={menu.data?.stations.find((s) => s.id === v.ticket.stationId)}
                      showStation={selected === ALL}
                      now={now}
                      busy={pending?.ticketId === v.ticket.id && pending.from === v.ticket.status}
                      onMove={(to) => move(v.ticket.id, v.ticket.status, to)}
                      onUndoPickup={allowed('ticket.update') || allowed('ticket.serve') ? () => void undoPickup(v.ticket.id) : undefined}
                      onGive={allowed('ticket.update') ? (itemId, foodId) => setGiving({ view: v, itemId, foodId }) : undefined}
                      onKeep={allowed('ticket.update') ? () => void attempt(() => getApi().decideCancelledTicket(v.ticket.id, 'KEEP', null)) : undefined}
                      onStop={allowed('ticket.update') ? () => setStopping(v.ticket.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {giving && (
        <GiveFoodDialog
          giving={giving}
          now={now}
          onClose={() => setGiving(null)}
          onGive={() => {
            const { itemId, foodId } = giving;
            setGiving(null);
            void attempt(() => getApi().giveAvailableFood(itemId, foodId));
          }}
        />
      )}
      {stopping && (
        <StopFoodDialog
          onClose={() => setStopping(null)}
          onStop={(spoilt) => {
            const ticketId = stopping;
            setStopping(null);
            void attempt(() => getApi().decideCancelledTicket(ticketId, 'STOP', spoilt));
          }}
        />
      )}
      {reporting && <ReportWasteDialog onClose={() => setReporting(false)} />}
      {stockOpen && (
        <StockDialog
          station={stations.find((s) => s.id === selected)}
          onClose={() => setStockOpen(false)}
          onError={(message) => toast.show({ tone: 'error', title: message })}
        />
      )}
    </>
  );
}

/**
 * Give ready food of the same dish to this line (owner, 2026-11-09): the kitchen looks at it first. Its raw stock was taken once,
 * by the order it was made for; it is not taken again.
 */
function GiveFoodDialog({ giving, now, onClose, onGive }: { giving: { view: KitchenTicketView; itemId: string; foodId: string }; now: number; onClose: () => void; onGive: () => void }) {
  const [safe, setSafe] = useState(false);
  const item = giving.view.items.find((i) => i.id === giving.itemId);
  const food = giving.view.available?.[giving.itemId]?.find((f) => f.id === giving.foodId);
  if (!item || !food) return null;
  const name = item.variantName ? `${item.name} (${item.variantName})` : item.name;
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('kitchen.giveTitle', { name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button disabled={!safe} onClick={onGive} className="bg-green-600 bg-none hover:bg-green-700">
            {t('kitchen.giveFood')}
          </Button>
        </>
      }
    >
      <p className="mb-2">{t('kitchen.giveBody', { n: food.fromDailyNumber, min: Math.max(0, Math.floor((now - Date.parse(food.madeAt)) / 60_000)), until: new Date(food.safeUntil).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) })}</p>
      <p className="mb-3 text-sm text-slate-600">{t('kitchen.giveStock')}</p>
      <label className="flex min-h-12 items-center gap-2 rounded-xl bg-amber-50 px-3 font-bold text-amber-900">
        <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="size-5 accent-brand" />
        {t('kitchen.giveSafe')}
      </label>
    </Dialog>
  );
}

/** Stop a cancelled ticket: nothing is taken from stock, unless what was already used is spoilt (wastage with its reason). */
function StopFoodDialog({ onClose, onStop }: { onClose: () => void; onStop: (spoiltReason: string | null) => void }) {
  const [spoilt, setSpoilt] = useState(false);
  const [reason, setReason] = useState<string>(WASTE_REASONS[3]);
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('kitchen.stopTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button onClick={() => onStop(spoilt ? reason : null)} className="bg-red-600 hover:bg-red-700">
            {t('kitchen.stopFood')}
          </Button>
        </>
      }
    >
      <p className="mb-3">{t('kitchen.stopBody')}</p>
      <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold">
        <input type="checkbox" checked={spoilt} onChange={(e) => setSpoilt(e.target.checked)} className="size-5 accent-brand" />
        {t('kitchen.stopSpoilt')}
      </label>
      {spoilt && (
        <label className="mt-2 block text-sm">
          <span className="mb-1 block font-bold text-slate-900">{t('food.reason')}</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2">
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      )}
    </Dialog>
  );
}

/** Out of stock ON/OFF for the station's items (the selected station, or all). */
function StockDialog({
  station,
  onClose,
  onError,
}: {
  station: KitchenStation | undefined;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const items = (menu.data?.items ?? []).filter((i) => !station || i.stationId === station.id);
  const toggle = async (id: string, available: boolean) => {
    try {
      await getApi().setItemAvailable(id, available);
    } catch (err) {
      onError(err instanceof Error ? err.message : t('states.errorBody'));
    }
  };
  return (
    <Dialog open onClose={onClose} title={t('kitchen.stockTitle', { station: station?.name ?? t('kitchen.allStations') })}>
      <p className="mb-3">{t('kitchen.stockBody')}</p>
      {!menu.data ? (
        <LoadingState />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id, !item.isAvailable)}
                aria-pressed={!item.isAvailable}
                className={cn(
                  'flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left font-semibold',
                  item.isAvailable ? 'border-slate-200 text-slate-900' : 'border-red-200 bg-red-50 text-red-800',
                )}
              >
                {item.name}
                <Badge tone={item.isAvailable ? 'green' : 'red'}>
                  {item.isAvailable ? t('kitchen.available') : t('waiter.outOfStock')}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

/** Whether the page is in full screen; leaving the Kitchen Display ends it, so the other screens keep their bars. */
function useFullScreen(): boolean {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const sync = () => {
      const on = document.fullscreenElement !== null;
      setFull(on);
      document.documentElement.toggleAttribute('data-kds-fullscreen', on);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.documentElement.removeAttribute('data-kds-fullscreen');
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, []);
  return full;
}
