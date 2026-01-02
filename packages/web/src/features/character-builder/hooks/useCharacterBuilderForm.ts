import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCharacter } from '../api.js';
import {
  createDetailEntry,
  createInitialState,
  type DetailFormEntry,
  type FormFieldErrors,
  type FormState,
} from '../types.js';
import { mapProfileToForm, mergeGeneratedIntoForm } from '../transformers.js';
import { type BodyMap } from '@minimal-rpg/schemas';
import { pruneBodyMap } from '@minimal-rpg/utils';

export { mapProfileToForm, mergeGeneratedIntoForm };

export interface UseCharacterBuilderFormResult {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  fieldErrors: FormFieldErrors;
  setFieldErrors: React.Dispatch<React.SetStateAction<FormFieldErrors>>;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateDetailEntry: <K extends keyof DetailFormEntry>(
    idx: number,
    key: K,
    value: DetailFormEntry[K]
  ) => void;
  addDetailEntry: () => void;
  removeDetailEntry: (idx: number) => void;
  updateBody: (body: BodyMap) => void;
  loading: boolean;
  loadError: string | null;
}

export function useCharacterBuilderForm(id?: string | null): UseCharacterBuilderFormResult {
  const [form, setForm] = useState<FormState>(() => createInitialState());
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setFieldErrors({});
    abortRef.current?.abort();

    if (!id) {
      setForm(createInitialState());
      setLoadError(null);
      setLoading(false);
      return () => {
        abortRef.current?.abort();
      };
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setLoadError(null);

    loadCharacter(id, ctrl.signal)
      .then((profile) => {
        setForm(mapProfileToForm(profile));
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error(err);
        setLoadError('Failed to load character');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      ctrl.abort();
    };
  }, [id]);

  const updateField: UseCharacterBuilderFormResult['updateField'] = useCallback((key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      // If race or gender changes, prune invalid body regions
      if (key === 'race' || key === 'gender') {
        next.body = pruneBodyMap(next.body, next.race, next.gender);
      }

      return next;
    });
  }, []);

  const updateDetailEntry: UseCharacterBuilderFormResult['updateDetailEntry'] = useCallback(
    (idx, key, value) => {
      setForm((prev) => {
        const details = prev.details.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, details };
      });
    },
    []
  );

  const addDetailEntry = useCallback(() => {
    setForm((prev) => ({ ...prev, details: [...prev.details, createDetailEntry()] }));
  }, []);

  const removeDetailEntry = useCallback((idx: number) => {
    setForm((prev) => {
      const next = prev.details.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, details: next.length ? next : [createDetailEntry()] };
    });
  }, []);

  const updateBody = useCallback((body: BodyMap) => {
    setForm((prev) => ({ ...prev, body }));
  }, []);

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    updateField,
    updateDetailEntry,
    addDetailEntry,
    removeDetailEntry,
    updateBody,
    loading,
    loadError,
  };
}
