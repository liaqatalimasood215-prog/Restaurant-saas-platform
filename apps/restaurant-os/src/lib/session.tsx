'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PermissionContext } from '@restaurant-saas/shared';
import { getApi, type Session } from '@/lib/api';
import { useApiQuery, type ApiQuery } from '@/lib/hooks/use-api-query';

interface SessionState extends ApiQuery<Session> {
  /** Restaurant-level switches that change permissions (e.g. Manager money reports) */
  permissionContext: PermissionContext;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useApiQuery(() => getApi().getSession(), []);
  const permissionContext: PermissionContext = {
    managerCanSeeMoneyReports: query.data?.branch.managerCanSeeMoneyReports ?? false,
  };
  return <SessionContext.Provider value={{ ...query, permissionContext }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) throw new Error('useSession must be used inside <SessionProvider>');
  return state;
}
