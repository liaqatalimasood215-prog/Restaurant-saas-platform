'use client';

import { createContext, useContext } from 'react';
import type { RiderAccount, RiderDelivery } from '@restaurant-saas/shared';
import type { RiderBranch } from '@/lib/api';

export interface RiderContextValue {
  /** "/aziz-pizza/main" */
  base: string;
  branch: RiderBranch;
  me: RiderAccount;
  deliveries: RiderDelivery[];
  /** A short message at the bottom of the screen */
  notify: (text: string, tone?: 'ok' | 'error') => void;
}

export const RiderContext = createContext<RiderContextValue | null>(null);

export function useRider(): RiderContextValue {
  const value = useContext(RiderContext);
  if (!value) throw new Error('useRider is used outside the Rider App shell');
  return value;
}
