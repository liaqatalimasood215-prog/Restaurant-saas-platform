'use client';

import { useEffect, useRef, useState } from 'react';
import { PackageX, Volume2, VolumeX } from 'lucide-react';
import { can, type KitchenStation, type TicketStatus } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
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
import { playAlert, unlockSound } from '@/lib/sound';
import { TICKET_TONES } from '@/lib/tones';
import { TicketCard } from './ticket-card';

const ALL = 'ALL';
const STATION_KEY = 'lala-os-kds-station';
const COLUMNS = [
  { status: 'NEW', label: 'kitchen.columnNew' },
  { status: 'PREPARING', label: 'kitchen.columnPreparing' },
  { status: 'READY', label: 'kitchen.columnReady' },
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
  const { data: session } = useSession();
  const tickets = useApiQuery(() => getApi().listKitchenTickets(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  const [stationId, setStationId] = useState(readStoredStation);
  const [soundOn, setSoundOn] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
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
  const visible = (tickets.data ?? []).filter((v) => selected === ALL || v.ticket.stationId === selected);

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
    if (fresh.length > 0 && soundOn) playAlert();
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

  const header = (
    <ScreenHeader
      title={t('nav.kitchen')}
      status="DEMO_PROTOTYPE"
      description={t('kitchen.description')}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant={soundOn ? 'secondary' : 'outline'} onClick={enableSound}>
            {soundOn ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
            {soundOn ? t('kitchen.soundOn') : t('kitchen.enableSound')}
          </Button>
          {user && can(user.role, 'item.outOfStock') && (
            <Button variant="secondary" onClick={() => setStockOpen(true)} disabled={!menu.data}>
              <PackageX className="size-5" aria-hidden />
              {t('kitchen.outOfStock')}
            </Button>
          )}
        </div>
      }
    />
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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
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
                'flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-base font-bold',
                selected === s.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700',
              )}
            >
              {s.name}
              {count > 0 && <span className="rounded-full bg-brand px-2 text-xs text-white">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTickets = visible.filter((v) => v.ticket.status === column.status);
          return (
            <section key={column.status} aria-label={t(column.label)} className="min-w-0">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                <Badge tone={TICKET_TONES[column.status]} className="text-sm">
                  {t(column.label)}
                </Badge>
                <span className="tabular-nums text-slate-500">{columnTickets.length}</span>
              </h2>
              {columnTickets.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  {t('kitchen.empty')}
                </p>
              ) : (
                <div className="space-y-3">
                  {columnTickets.map((v) => (
                    <TicketCard
                      key={v.ticket.id}
                      view={v}
                      station={menu.data?.stations.find((s) => s.id === v.ticket.stationId)}
                      showStation={selected === ALL}
                      now={now}
                      busy={pending?.ticketId === v.ticket.id && pending.from === v.ticket.status}
                      onMove={(to) => move(v.ticket.id, v.ticket.status, to)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

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
