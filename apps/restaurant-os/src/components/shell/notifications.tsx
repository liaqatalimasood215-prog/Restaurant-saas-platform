'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatPaisa, formatQuantity, type NotificationItem, type StaffNotification } from '@restaurant-saas/shared';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { playTone, speak, unlockSound, vibrate, type AlertTone } from '@/lib/sound';

const NotificationsContext = createContext<StaffNotification[]>([]);
const ALARM_REPEAT_MS = 5000;
const REMINDER_CHECK_MS = 30_000;

export function itemsText(items: NotificationItem[]): string {
  return items
    .map((i) => `${formatQuantity(i.quantity, i.unit)} ${i.name}${i.variantName ? ` (${i.variantName})` : ''}`)
    .join(', ');
}

export function notificationTitle(n: StaffNotification): string {
  switch (n.kind) {
    case 'FOOD_READY':
      return n.reminder ? t('alerts.foodWaiting', { table: n.tableName, station: n.stationName }) : t('alerts.foodReady', { table: n.tableName, station: n.stationName });
    case 'BILL_REQUESTED':
      return t('alerts.billRequested', { table: n.tableName });
    case 'BILL_ACCEPTED':
      return t('alerts.billAccepted', { table: n.tableName });
    case 'WAITER_CALLED':
      return n.tableName ? t('alerts.waiterCalled', { table: n.tableName }) : t('alerts.waiterCalledCounter');
    case 'ONLINE_ORDER':
      return t('alerts.onlineOrder', { n: n.dailyNumber });
    case 'COUNTER_READY':
      return t('alerts.counterReady', { n: n.dailyNumber, type: t(`orderType.${n.orderType}`) });
    case 'COOKING_SHORTAGE':
      return t(n.forDay === 'TOMORROW' ? 'alerts.cookingShortTomorrow' : 'alerts.cookingShortToday', { n: n.count, time: n.time });
    case 'COOKED_NEGATIVE':
      return t('alerts.cookedNegative', { n: n.count });
    case 'FOOD_REVIEW':
      return t('alerts.foodReview', { n: n.count });
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
    case 'COOKING_SHORTAGE':
      return t('alerts.cookingShortBody', { names: n.names.join(', ') + (n.count > n.names.length ? ' …' : '') });
    case 'COOKED_NEGATIVE':
      return t('alerts.cookedNegativeBody', { names: n.names.join(', ') + (n.count > n.names.length ? ' …' : '') });
    case 'FOOD_REVIEW':
      return t('alerts.foodReviewBody', { names: n.names.join(', ') + (n.count > n.names.length ? ' …' : '') });
  }
}

const ALERT_TONES: Record<StaffNotification['kind'], AlertTone> = {
  ONLINE_ORDER: 'ORDER',
  WAITER_CALLED: 'CALL',
  BILL_REQUESTED: 'BILL',
  BILL_ACCEPTED: 'BILL',
  FOOD_READY: 'READY',
  COUNTER_READY: 'READY',
  COOKING_SHORTAGE: 'BILL',
  COOKED_NEGATIVE: 'BILL',
  FOOD_REVIEW: 'BILL',
};
const ALERT_ORDER: StaffNotification['kind'][] = ['ONLINE_ORDER', 'WAITER_CALLED', 'BILL_REQUESTED', 'FOOD_READY', 'COUNTER_READY', 'BILL_ACCEPTED', 'COOKING_SHORTAGE', 'COOKED_NEGATIVE', 'FOOD_REVIEW'];

/** What the device says aloud: Roman Urdu, and Urdu or Hindi for devices with that voice (lib/sound.ts). */
function notificationSpeech(n: StaffNotification): { roman: string; urdu: string; hindi: string } {
  const say = (key: 'onlineOrder' | 'waiterCalled' | 'bill' | 'billAccepted' | 'foodReady' | 'foodWaiting' | 'counterReady' | 'cookingShort' | 'cookedNegative' | 'foodReview', vars?: Record<string, string | number>) => ({
    roman: t(`alerts.speech.${key}.roman`, vars),
    urdu: t(`alerts.speech.${key}.urdu`, vars),
    hindi: t(`alerts.speech.${key}.hindi`, vars),
  });
  switch (n.kind) {
    case 'ONLINE_ORDER':
      return say('onlineOrder', { name: n.customerName.replace(/\s*\(DEMO\)$/, '') });
    case 'WAITER_CALLED':
      return say('waiterCalled');
    case 'BILL_REQUESTED':
      return say('bill', { table: n.tableName });
    case 'BILL_ACCEPTED':
      return say('billAccepted', { table: n.tableName });
    case 'FOOD_READY':
      return say(n.reminder ? 'foodWaiting' : 'foodReady', { table: n.tableName });
    case 'COUNTER_READY':
      return say('counterReady', { n: n.dailyNumber });
    case 'COOKING_SHORTAGE':
      return say('cookingShort', { n: n.count });
    case 'COOKED_NEGATIVE':
      return say('cookedNegative');
    case 'FOOD_REVIEW':
      return say('foodReview', { n: n.count });
  }
}

export function notificationLink(n: StaffNotification): string {
  switch (n.kind) {
    case 'BILL_REQUESTED':
      return `/pos?table=${n.tableId}`;
    case 'WAITER_CALLED':
      return n.tableId ? `/waiter?table=${n.tableId}` : '/waiter';
    case 'ONLINE_ORDER':
    case 'COUNTER_READY':
      return '/online-orders';
    case 'COOKING_SHORTAGE':
      return `/inventory?cooking=${n.planDate}`;
    case 'COOKED_NEGATIVE':
      return '/inventory?cooking=today';
    case 'FOOD_REVIEW':
      return '/inventory?food=review';
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
  const { data, reload } = useApiQuery(() => getApi().listNotifications(), []);
  // Some alerts come with time (food still at the pass after 10 minutes, owner 2026-11-09): look again every 30 seconds
  useEffect(() => {
    const id = setInterval(reload, REMINDER_CHECK_MS);
    return () => clearInterval(id);
  }, [reload]);
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
    // The most urgent one is played and spoken: staff may not be looking at the screen.
    const first = [...fresh].sort((a, b) => ALERT_ORDER.indexOf(a.kind) - ALERT_ORDER.indexOf(b.kind))[0];
    if (first) {
      playTone(ALERT_TONES[first.kind]);
      vibrate();
      speak(notificationSpeech(first));
    }
  }, [data, onChange, toast]);

  // A new online order rings again and again until someone accepts or rejects it (§5.2 step 2).
  const waitingOnline = data?.some((n) => n.kind === 'ONLINE_ORDER') ?? false;
  useEffect(() => {
    if (!waitingOnline) return;
    const id = setInterval(() => playTone('ORDER'), ALARM_REPEAT_MS);
    return () => clearInterval(id);
  }, [waitingOnline]);

  return null;
}

export function useNotifications(): StaffNotification[] {
  return useContext(NotificationsContext);
}
