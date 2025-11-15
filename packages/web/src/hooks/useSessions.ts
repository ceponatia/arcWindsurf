import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSummary } from '../types.js';
import { getSessions } from '../api/client.js';

export interface SessionsState {
  loading: boolean;
  error: string | null;
  data: SessionSummary[] | null;
}

export function useSessions() {
  const [state, setState] = useState<SessionsState>({ loading: true, error: null, data: null });
  const controllerRef = useRef<AbortController | null>(null);

  const fetchSessions = useCallback(() => {
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setState((prev) => ({ loading: true, error: null, data: prev.data }));
    getSessions(ctrl.signal)
      .then((json: SessionSummary[]) => {
        setState({ loading: false, error: null, data: json });
      })
      .catch((err: unknown) => {
        if ((err instanceof DOMException || err instanceof Error) && err.name === 'AbortError')
          return;
        const message = (err as Error).message || 'Failed to load sessions';
        setState((prev) => ({ loading: false, error: message, data: prev.data }));
      });
  }, []);

  useEffect(() => {
    fetchSessions();
    return () => {
      controllerRef.current?.abort();
    };
  }, [fetchSessions]);

  return { ...state, refresh: fetchSessions };
}
