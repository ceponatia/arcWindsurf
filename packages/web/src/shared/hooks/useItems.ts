import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { ItemSummary } from '../../types.js';
import { getItems } from '../api/client.js';

export interface ItemsState {
  loading: boolean;
  error: string | null;
  data: ItemSummary[] | null;
}

export interface UseItemsResult extends ItemsState {
  retry: () => void;
}

export function useItems(): UseItemsResult {
  const [state, setState] = useState<ItemsState>({ loading: true, error: null, data: null });
  const controllerRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef(false);

  const fetchOnce = () => {
    if (fetchedRef.current) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setState((prev) => ({ loading: true, error: null, data: prev.data }));
    getItems(undefined, ctrl.signal)
      .then((items) => {
        fetchedRef.current = true;
        setState({ loading: false, error: null, data: items });
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        const message = getErrorMessage(err, 'Failed to load items');
        fetchedRef.current = true;
        setState((prev) => ({ loading: false, error: message, data: prev.data }));
      });
  };

  useEffect(() => {
    fetchOnce();
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const retry = () => {
    fetchedRef.current = false;
    fetchOnce();
  };

  return { ...state, retry };
}
