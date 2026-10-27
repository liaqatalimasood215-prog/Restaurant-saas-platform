'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { getApi } from '@/lib/api';

export interface ApiQuery<T> {
  data: T | undefined;
  error: Error | null;
  /** True only for the first load; later reloads keep showing the old data. */
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data through the ApiClient and reloads it whenever the API reports a change
 * (DEMO sync now, Socket.IO events from Phase 5).
 */
export function useApiQuery<T>(load: () => Promise<T>, deps: DependencyList): ApiQuery<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  const requestId = useRef(0);

  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(() => {
    const id = ++requestId.current;
    loadRef
      .current()
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    run();
    return getApi().subscribe(run);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the caller's deps change
  }, [run, ...deps]);

  const reload = useCallback(() => {
    setLoading(true);
    run();
  }, [run]);

  return { data, error, loading, reload };
}
