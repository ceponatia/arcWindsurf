import { useEffect, useRef, useState } from 'react';
import type { CharacterSummary } from '../types.js';
import { getCharacters } from '../api/client.js';

export interface CharactersState {
  loading: boolean;
  error: string | null;
  data: CharacterSummary[] | null;
}

export function useCharacters() {
  const [state, setState] = useState<CharactersState>({ loading: true, error: null, data: null });
  const controllerRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef(false);

  const fetchOnce = () => {
    if (fetchedRef.current) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setState((prev) => ({ loading: true, error: null, data: prev.data }));
    getCharacters(ctrl.signal)
      .then((json: CharacterSummary[]) => {
        fetchedRef.current = true;
        setState({ loading: false, error: null, data: json });
      })
      .catch((err: unknown) => {
        if ((err instanceof DOMException || err instanceof Error) && err.name === 'AbortError')
          return;
        const message = (err as Error).message || 'Failed to load characters';
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
