import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCharacter } from '../api.js';
import {
  createDetailEntry,
  createBodySensoryEntry,
  createAppearanceEntry,
  createInitialState,
  type AppearanceEntry,
  type BodySensoryEntry,
  type DetailFormEntry,
  type FormFieldErrors,
  type FormState,
} from '../types.js';
import { mapProfileToForm, mergeGeneratedIntoForm } from '../transformers.js';

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
  updateBodyEntry: <K extends keyof BodySensoryEntry>(
    idx: number,
    key: K,
    value: BodySensoryEntry[K]
  ) => void;
  addBodyEntry: (entry?: BodySensoryEntry) => void;
  removeBodyEntry: (idx: number) => void;
  updateAppearanceEntry: <K extends keyof AppearanceEntry>(
    idx: number,
    key: K,
    value: AppearanceEntry[K]
  ) => void;
  addAppearanceEntry: (entry?: AppearanceEntry) => void;
  removeAppearanceEntry: (idx: number) => void;
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
    setForm((prev) => ({ ...prev, [key]: value }));
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

  const updateBodyEntry: UseCharacterBuilderFormResult['updateBodyEntry'] = useCallback(
    (idx, key, value) => {
      setForm((prev) => {
        const bodySensory = prev.bodySensory.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, bodySensory };
      });
    },
    []
  );

  const addBodyEntry = useCallback((entry?: BodySensoryEntry) => {
    setForm((prev) => ({
      ...prev,
      bodySensory: [...prev.bodySensory, entry ?? createBodySensoryEntry()],
    }));
  }, []);

  const removeBodyEntry = useCallback((idx: number) => {
    setForm((prev) => {
      const next = prev.bodySensory.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, bodySensory: next.length ? next : [createBodySensoryEntry()] };
    });
  }, []);

  const updateAppearanceEntry: UseCharacterBuilderFormResult['updateAppearanceEntry'] = useCallback(
    (idx, key, value) => {
      setForm((prev) => {
        const appearances = prev.appearances.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, appearances };
      });
    },
    []
  );

  const addAppearanceEntry = useCallback((entry?: AppearanceEntry) => {
    setForm((prev) => ({
      ...prev,
      appearances: [...prev.appearances, entry ?? createAppearanceEntry()],
    }));
  }, []);

  const removeAppearanceEntry = useCallback((idx: number) => {
    setForm((prev) => {
      const next = prev.appearances.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, appearances: next.length ? next : [createAppearanceEntry()] };
    });
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
    updateBodyEntry,
    addBodyEntry,
    removeBodyEntry,
    updateAppearanceEntry,
    addAppearanceEntry,
    removeAppearanceEntry,
    loading,
    loadError,
  };
}
