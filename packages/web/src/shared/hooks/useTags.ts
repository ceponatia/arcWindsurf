import { useEffect, useRef, useState } from 'react';
import { getErrorMessage, isAbortError } from '@minimal-rpg/utils';
import type { TagSummary, TagsState, UseTagsResult } from '../../types.js';
import { getTags } from '../api/client.js';

export function useTags(): UseTagsResult {
  const [state, setState] = useState<TagsState>({ loading: true, error: null, data: null });
  const controllerRef = useRef<AbortController | null>(null);
  const fetchedRef = useRef(false);

  const fetchOnce = () => {
    if (fetchedRef.current) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setState((prev) => ({ loading: true, error: null, data: prev.data }));
    getTags(ctrl.signal)
      .then((json) => {
        fetchedRef.current = true;
        // Map TagResponse to TagSummary
        const tags: TagSummary[] = json.map((t) => ({
          id: t.id,
          name: t.name,
          shortDescription: t.shortDescription ?? null,
          promptText: t.promptText,
          targetType: t.targetType ?? 'session',
        }));
        setState({ loading: false, error: null, data: tags });
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        const message = getErrorMessage(err, 'Failed to load tags');
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
