import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';

export interface FetchState<TData> {
  loading: boolean;
  error: string | null;
  data: TData | null;
}

export type UseFetchOnceResult<TData> = FetchState<TData> & {
  retry: () => void;
};

export interface UseFetchOnceOptions<TData, TRaw = TData> {
  fetcher: (signal: AbortSignal) => Promise<TRaw>;
  mapData?: (raw: TRaw) => TData;
  initialData?: TData | null;
  errorMessage?: string;
}

export function useFetchOnce<TData, TRaw = TData>({
  fetcher,
  mapData,
  initialData = null,
  errorMessage = 'Failed to load data',
}: UseFetchOnceOptions<TData, TRaw>): UseFetchOnceResult<TData> {
  const [state, setState] = useState<FetchState<TData>>({
    loading: true,
    error: null,
    data: initialData,
  });
  const fetcherRef = useRef(fetcher);
  const mapDataRef = useRef(mapData);
  const controllerRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    mapDataRef.current = mapData;
  }, [mapData]);

  const fetchOnce = useCallback(() => {
    if (fetchedRef.current) return;

    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setState((prev) => ({
      loading: true,
      error: null,
      data: prev.data ?? initialData,
    }));

    fetcherRef.current(ctrl.signal)
      .then((raw) => {
        fetchedRef.current = true;
        const data = mapDataRef.current ? mapDataRef.current(raw) : (raw as TData);
        setState({ loading: false, error: null, data });
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        fetchedRef.current = true;
        const message = getErrorMessage(err, errorMessage);
        setState((prev) => ({
          loading: false,
          error: message,
          data: prev.data ?? initialData,
        }));
      });
  }, [errorMessage, initialData]);

  useEffect(() => {
    fetchOnce();
    return () => {
      controllerRef.current?.abort();
    };
  }, [fetchOnce]);

  const retry = () => {
    fetchedRef.current = false;
    fetchOnce();
  };

  return { ...state, retry };
}
