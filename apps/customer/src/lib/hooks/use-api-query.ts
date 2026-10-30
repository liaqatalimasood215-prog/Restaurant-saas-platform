'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';
import { getApi } from '@/lib/api';

export interface ApiQuery<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

/** Loads data through the StoreApi and reloads when the API reports a change. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller lists what the query depends on
  }, deps);

  return { data, error, loading, reload: run };
}
