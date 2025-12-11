import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { PersonaSummary } from '../../types.js';
import { getPersonas } from '../api/client.js';

export interface PersonasState {
  loading: boolean;
  error: string | null;
  data: PersonaSummary[] | null;
}

export interface UsePersonasResult extends PersonasState {
  retry: () => void;
}

export function usePersonas(): UsePersonasResult {
  const [state, setState] = useState<PersonasState>({ loading: true, error: null, data: null });
  const controllerRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef(false);

  const fetchOnce = () => {
    if (fetchedRef.current) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setState((prev) => ({ loading: true, error: null, data: prev.data }));
    const fetchPersonas = getPersonas as (signal?: AbortSignal) => Promise<PersonaSummary[]>;
    fetchPersonas(ctrl.signal)
      .then((json: PersonaSummary[]) => {
        fetchedRef.current = true;
        setState({ loading: false, error: null, data: json });
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        const message = getErrorMessage(err, 'Failed to load personas');
        fetchedRef.current = true; // mark attempted; allow manual retry via retry() which resets ref
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
