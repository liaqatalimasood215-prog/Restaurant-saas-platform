'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatPaisa, formatQuantity, type NotificationItem, type StaffNotification } from '@restaurant-saas/shared';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { playAlert, unlockSound, vibrate } from '@/lib/sound';

const NotificationsContext = createContext<StaffNotification[]>([]);
const ALARM_REPEAT_MS = 5000;

export function itemsText(items: NotificationItem[]): string {
  return items
    .map((i) => `${formatQuantity(i.quantity, i.unit)} ${i.name}${i.variantName ? ` (${i.variantName})` : ''}`)
    .join(', ');
}

export function notificationTitle(n: StaffNotification): string {
  switch (n.kind) {
    case 'FOOD_READY':
      return t('alerts.foodReady', { table: n.tableName, station: n.stationName });
    case 'BILL_REQUESTED':
      return t('alerts.billRequested', { table: n.tableName });
    case 'BILL_ACCEPTED':
      return t('alerts.billAccepted', { table: n.tableName });
    case 'WAITER_CALLED':
      return t('alerts.waiterCalled', { table: n.tableName });
    case 'ONLINE_ORDER':
      return t('alerts.onlineOrder', { n: n.dailyNumber });
    case 'COUNTER_READY':
      return t('alerts.counterReady', { n: n.dailyNumber, type: t(`orderType.${n.orderType}`) });
  }
}

export function notificationBody(n: StaffNotification): string {
  switch (n.kind) {
    case 'FOOD_READY':
      return itemsText(n.items);
    case 'BILL_REQUESTED':
      return t('alerts.billRequestedBody', { total: formatPaisa(n.total), name: n.requestedByName });
    case 'BILL_ACCEPTED':
      return t('alerts.billAcceptedBody', { name: n.acceptedByName });
    case 'WAITER_CALLED':
      return t('alerts.waiterCalledBody', { name: n.calledByName });
    case 'ONLINE_ORDER':
      return t('alerts.onlineOrderBody', { type: t(`orderType.${n.orderType}`), total: formatPaisa(n.total), name: n.customerName });
    case 'COUNTER_READY':
      return n.orderType === 'DELIVERY' ? t('alerts.assignRider', { name: n.customerName || t('pos.walkIn') }) : t('alerts.readyForPickup', { name: n.customerName || t('pos.walkIn') });
  }
}

export function notificationLink(n: StaffNotification): string {
  switch (n.kind) {
    case 'BILL_REQUESTED':
      return `/pos?table=${n.tableId}`;
    case 'ONLINE_ORDER':
    case 'COUNTER_READY':
      return '/online-orders';
    default:
      return `/waiter?table=${n.tableId}`;
  }
}

/**
 * Staff notifications: food ready (Service Waiter), bill requested (Cashier), bill accepted (the
 * waiter who asked), "Call Waiter" from the POS (the waiter of the table). New ones show a message with sound and vibration. Phase 1: DEMO sync between
 * tabs of one browser; between phones this needs the backend and live sync (Phases 4–5).
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [list, setList] = useState<StaffNotification[]>([]);

  // Browsers allow sound only after the first tap on the page.
  useEffect(() => {
    const unlock = () => unlockSound();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <NotificationsContext.Provider value={session ? list : []}>
      {session && <NotificationsWatcher key={session.user.id} onChange={setList} />}
      {children}
    </NotificationsContext.Provider>
  );
}

/** Keyed by user: after a login the notifications that already exist are not announced again. */
function NotificationsWatcher({ onChange }: { onChange: (list: StaffNotification[]) => void }) {
  const { data } = useApiQuery(() => getApi().listNotifications(), []);
  const seen = useRef<Set<string> | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!data) return;
    onChange(data);
    if (seen.current === null) {
      seen.current = new Set(data.map((n) => n.id));
      return;
    }
    const fresh = data.filter((n) => !seen.current?.has(n.id));
    for (const n of fresh) {
      seen.current.add(n.id);
      toast.show({ tone: n.kind === 'BILL_REQUESTED' || n.kind === 'ONLINE_ORDER' || n.kind === 'WAITER_CALLED' ? 'info' : 'success', title: notificationTitle(n), body: notificationBody(n) });
    }
    if (fresh.length > 0) {
      playAlert();
      vibrate();
    }
  }, [data, onChange, toast]);

  // A new online order rings again and again until someone accepts or rejects it (§5.2 step 2).
  const waitingOnline = data?.some((n) => n.kind === 'ONLINE_ORDER') ?? false;
  useEffect(() => {
    if (!waitingOnline) return;
    const id = setInterval(playAlert, ALARM_REPEAT_MS);
    return () => clearInterval(id);
  }, [waitingOnline]);

  return null;
}

export function useNotifications(): StaffNotification[] {
  return useContext(NotificationsContext);
}
