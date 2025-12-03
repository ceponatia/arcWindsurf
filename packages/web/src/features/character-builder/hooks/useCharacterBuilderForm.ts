import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterProfile, Physique } from '@minimal-rpg/schemas';
import { loadCharacter } from '../api.js';
import {
  createDetailEntry,
  createInitialState,
  type DetailFormEntry,
  type FormFieldErrors,
  type FormState,
} from '../types.js';

function mapProfileToForm(profile: CharacterProfile): FormState {
  const next = createInitialState();
  next.id = profile.id;
  next.name = profile.name;
  next.age = profile.age;
  next.summary = profile.summary;
  next.backstory = profile.backstory ?? '';
  next.tags = (profile.tags ?? []).join(', ');
  next.personality = Array.isArray(profile.personality)
    ? profile.personality.join(', ')
    : (profile.personality ?? '');
  next.speakingStyle = profile.speakingStyle ?? '';

  const physique = profile.physique;
  if (typeof physique === 'string') {
    next.appearance = physique;
  } else if (physique && typeof physique === 'object') {
    const typedPhysique = physique as Physique;
    const appearance = typedPhysique.appearance;
    next.apHairColor = appearance.hair.color;
    next.apHairStyle = appearance.hair.style;
    next.apHairLength = appearance.hair.length;
    next.apEyesColor = appearance.eyes.color;
    next.apHeight = typedPhysique.build.height;
    next.apTorso = typedPhysique.build.torso;
    next.apSkinTone = typedPhysique.build.skinTone;
    next.apFeatures = (appearance.features ?? []).join(', ');
    next.apArmsBuild = typedPhysique.build.arms.build;
    next.apArmsLength = typedPhysique.build.arms.length;
    next.apLegsBuild = typedPhysique.build.legs.build;
    next.apLegsLength = typedPhysique.build.legs.length;
  }

  if (profile.scent) {
    next.scentHair = profile.scent.hairScent ?? '';
    next.scentBody = profile.scent.bodyScent ?? '';
    next.scentPerfume = profile.scent.perfume ?? '';
  }

  if (profile.style) {
    next.styleSentenceLength = profile.style.sentenceLength ?? '';
    next.styleHumor = profile.style.humor ?? '';
    next.styleDarkness = profile.style.darkness ?? '';
    next.stylePacing = profile.style.pacing ?? '';
    next.styleFormality = profile.style.formality ?? '';
    next.styleVerbosity = profile.style.verbosity ?? '';
  }

  if (Array.isArray(profile.details) && profile.details.length) {
    next.details = profile.details.map(
      (detail) =>
        ({
          label: detail.label,
          value: detail.value,
          area: detail.area ?? 'custom',
          importance: detail.importance !== undefined ? String(detail.importance) : '0.5',
          tags: (detail.tags ?? []).join(', '),
          notes: detail.notes ?? '',
        }) satisfies DetailFormEntry
    );
  }

  return next;
}

export interface UseCharacterBuilderFormResult {
  form: FormState;
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

  return {
    form,
    fieldErrors,
    setFieldErrors,
    updateField,
    updateDetailEntry,
    addDetailEntry,
    removeDetailEntry,
    loading,
    loadError,
  };
}
