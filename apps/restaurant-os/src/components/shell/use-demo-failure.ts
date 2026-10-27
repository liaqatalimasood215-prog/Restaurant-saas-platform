'use client';

import { useSyncExternalStore } from 'react';
import { getApi, getDemoControls } from '@/lib/api';

const subscribe = (onChange: () => void) => getApi().subscribe(onChange);
const getSnapshot = () => getDemoControls().isSimulatingFailure();
const getServerSnapshot = () => false;

/** Whether the DEMO "simulate connection error" tool is on. Always false while rendering on the server. */
export function useDemoFailure(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
