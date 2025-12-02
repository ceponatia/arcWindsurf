import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { SettingSummary } from '../types.js';
import { getSettings } from '../api/client.js';

export interface SettingsState {
  loading: boolean;
  error: string | null;
  data: SettingSummary[] | null;
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({ loading: true, error: null, data: null });
  const controllerRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef(false);

  const fetchOnce = () => {
    if (fetchedRef.current) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setState((prev) => ({ loading: true, error: null, data: prev.data }));
    getSettings(ctrl.signal)
      .then((json: SettingSummary[]) => {
        fetchedRef.current = true;
        setState({ loading: false, error: null, data: json });
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        const message = getErrorMessage(err, 'Failed to load settings');
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
