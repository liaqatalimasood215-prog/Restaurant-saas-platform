'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { can, type ReadyAlert } from '@restaurant-saas/shared';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { playAlert, unlockSound, vibrate } from '@/lib/sound';

const AlertsContext = createContext<ReadyAlert[]>([]);

/**
 * "Food ready" alerts for floor staff (MASTER_PROMPT.md §5.1 step 5): a toast with sound and
 * vibration when a kitchen ticket becomes Ready. In Phase 1 this is DEMO sync between tabs.
 */
export function ReadyAlertsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<ReadyAlert[]>([]);
  const enabled = !!session && can(session.user.role, 'table.order');

  // Browsers allow sound only after the first tap on the page.
  useEffect(() => {
    const unlock = () => unlockSound();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <AlertsContext.Provider value={enabled ? alerts : []}>
      {enabled && <AlertsWatcher key={session.user.id} onChange={setAlerts} />}
      {children}
    </AlertsContext.Provider>
  );
}

/** Keyed by user: after a role switch the alerts that already exist are not announced again. */
function AlertsWatcher({ onChange }: { onChange: (alerts: ReadyAlert[]) => void }) {
  const { data } = useApiQuery(() => getApi().listReadyAlerts(), []);
  const seen = useRef<Set<string> | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!data) return;
    onChange(data);
    if (seen.current === null) {
      seen.current = new Set(data.map((a) => a.ticketId));
      return;
    }
    const fresh = data.filter((a) => !seen.current?.has(a.ticketId));
    for (const alert of fresh) {
      seen.current.add(alert.ticketId);
      toast.show({ tone: 'success', title: t('alerts.foodReady', { table: alert.tableName, station: alert.stationName }) });
    }
    if (fresh.length > 0) {
      playAlert();
      vibrate();
    }
  }, [data, onChange, toast]);

  return null;
}

export function useReadyAlerts(): ReadyAlert[] {
  return useContext(AlertsContext);
}
