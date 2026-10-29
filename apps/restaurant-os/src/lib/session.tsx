'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Permission } from '@restaurant-saas/shared';
import { getApi, type Session } from '@/lib/api';
import { useApiQuery, type ApiQuery } from '@/lib/hooks/use-api-query';

/** data: undefined = still loading, null = logged out. */
interface SessionState extends ApiQuery<Session | null> {
  /**
   * May the logged-in person do this? Uses their own permissions (Role Permissions / custom set).
   * Only hides buttons — the server checks every request.
   */
  allowed: (permission: Permission) => boolean;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const query = useApiQuery(() => getApi().getSession(), []);
  const permissions = query.data?.permissions;
  const allowed = (permission: Permission) => permissions?.includes(permission) ?? false;
  return <SessionContext.Provider value={{ ...query, allowed }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (!state) throw new Error('useSession must be used inside <SessionProvider>');
  return state;
}
