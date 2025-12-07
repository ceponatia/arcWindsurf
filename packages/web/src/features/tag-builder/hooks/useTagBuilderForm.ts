import { useCallback, useEffect, useRef, useState } from 'react';
import type { TagResponse } from '@minimal-rpg/schemas';
import { loadTag } from '../api.js';
import {
  createInitialState,
  createTriggerEntry,
  type FormFieldErrors,
  type TagFormState,
  type TriggerFormEntry,
} from '../types.js';

/**
 * Map API response to form state.
 */
function mapResponseToForm(tag: TagResponse): TagFormState {
  const form = createInitialState();

  form.id = tag.id;
  form.name = tag.name;
  form.shortDescription = tag.shortDescription ?? '';
  form.category = tag.category ?? 'style';
  form.promptText = tag.promptText;
  form.activationMode = tag.activationMode ?? 'always';
  form.targetType = tag.targetType ?? 'session';
  form.priority = tag.priority ?? 'normal';
  form.compositionMode = tag.compositionMode ?? 'append';
  form.conflictsWith = (tag.conflictsWith ?? []).join(', ');
  form.requires = (tag.requires ?? []).join(', ');
  form.visibility = tag.visibility ?? 'public';
  form.version = tag.version ?? '1.0.0';
  form.isBuiltIn = tag.isBuiltIn ?? false;

  // Map triggers
  if (Array.isArray(tag.triggers) && tag.triggers.length > 0) {
    form.triggers = tag.triggers.map((t) => {
      const entry = createTriggerEntry();
      entry.condition = t.condition;
      entry.invert = t.invert ?? false;

      if (t.params) {
        entry.intents = (t.params.intents ?? []).join(', ');
        entry.keywords = (t.params.keywords ?? []).join(', ');
        entry.emotions = (t.params.emotions ?? []).join(', ');
        entry.relationshipLevels = (t.params.relationshipLevels ?? []).join(', ');
        entry.timeRange = t.params.timeRange ?? '';
        entry.locationIds = (t.params.locationIds ?? []).join(', ');
        entry.locationTags = (t.params.locationTags ?? []).join(', ');
        entry.stateFlags = (t.params.stateFlags ?? []).join(', ');
      }

      return entry;
    });
  }

  return form;
}

export interface UseTagBuilderFormResult {
  formState: TagFormState;
  fieldErrors: FormFieldErrors;
  setFieldErrors: React.Dispatch<React.SetStateAction<FormFieldErrors>>;
  updateField: <K extends keyof TagFormState>(key: K, value: TagFormState[K]) => void;
  // Trigger helpers
  updateTriggerEntry: <K extends keyof TriggerFormEntry>(
    idx: number,
    key: K,
    value: TriggerFormEntry[K]
  ) => void;
  addTriggerEntry: () => void;
  removeTriggerEntry: (idx: number) => void;
  reset: () => void;
  loading: boolean;
  loadError: string | null;
}

export function useTagBuilderForm(id?: string | null): UseTagBuilderFormResult {
  const [formState, setFormState] = useState<TagFormState>(() => createInitialState());
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setFieldErrors({});
    abortRef.current?.abort();

    if (!id) {
      setFormState(createInitialState());
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

    loadTag(id, ctrl.signal)
      .then((tag) => {
        setFormState(mapResponseToForm(tag));
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.error(err);
        setLoadError('Failed to load tag');
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

  const updateField: UseTagBuilderFormResult['updateField'] = useCallback((key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTriggerEntry: UseTagBuilderFormResult['updateTriggerEntry'] = useCallback(
    (idx, key, value) => {
      setFormState((prev) => {
        const triggers = prev.triggers.map((entry, entryIdx) =>
          entryIdx === idx ? { ...entry, [key]: value } : entry
        );
        return { ...prev, triggers };
      });
    },
    []
  );

  const addTriggerEntry = useCallback(() => {
    setFormState((prev) => ({ ...prev, triggers: [...prev.triggers, createTriggerEntry()] }));
  }, []);

  const removeTriggerEntry = useCallback((idx: number) => {
    setFormState((prev) => {
      const next = prev.triggers.filter((_, entryIdx) => entryIdx !== idx);
      return { ...prev, triggers: next };
    });
  }, []);

  const reset = useCallback(() => {
    setFormState(createInitialState());
    setFieldErrors({});
    setLoadError(null);
  }, []);

  return {
    formState,
    fieldErrors,
    setFieldErrors,
    updateField,
    updateTriggerEntry,
    addTriggerEntry,
    removeTriggerEntry,
    reset,
    loading,
    loadError,
  };
}

/**
 * Build API request from form state.
 */
export function buildCreateRequest(form: TagFormState) {
  const splitList = (s: string) =>
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const triggers = form.triggers
    .filter((t) => {
      // Only include triggers with at least one param filled
      switch (t.condition) {
        case 'intent':
          return t.intents.trim().length > 0;
        case 'keyword':
          return t.keywords.trim().length > 0;
        case 'emotion':
          return t.emotions.trim().length > 0;
        case 'relationship':
          return t.relationshipLevels.trim().length > 0;
        case 'time':
          return t.timeRange.trim().length > 0;
        case 'location':
          return t.locationIds.trim().length > 0 || t.locationTags.trim().length > 0;
        case 'state':
          return t.stateFlags.trim().length > 0;
        default:
          return false;
      }
    })
    .map((t) => ({
      condition: t.condition,
      invert: t.invert,
      params: {
        ...(t.intents.trim() ? { intents: splitList(t.intents) } : {}),
        ...(t.keywords.trim() ? { keywords: splitList(t.keywords) } : {}),
        ...(t.emotions.trim() ? { emotions: splitList(t.emotions) } : {}),
        ...(t.relationshipLevels.trim()
          ? { relationshipLevels: splitList(t.relationshipLevels) }
          : {}),
        ...(t.timeRange.trim() ? { timeRange: t.timeRange.trim() } : {}),
        ...(t.locationIds.trim() ? { locationIds: splitList(t.locationIds) } : {}),
        ...(t.locationTags.trim() ? { locationTags: splitList(t.locationTags) } : {}),
        ...(t.stateFlags.trim() ? { stateFlags: splitList(t.stateFlags) } : {}),
      },
    }));

  return {
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim() || undefined,
    category: form.category,
    promptText: form.promptText.trim(),
    activationMode: form.activationMode,
    targetType: form.targetType,
    triggers: triggers.length > 0 ? triggers : undefined,
    priority: form.priority,
    compositionMode: form.compositionMode,
    conflictsWith: splitList(form.conflictsWith).length ? splitList(form.conflictsWith) : undefined,
    requires: splitList(form.requires).length ? splitList(form.requires) : undefined,
    visibility: form.visibility,
  };
}

/**
 * Build API update request from form state.
 * Includes changelog if provided (triggers version increment).
 */
export function buildUpdateRequest(form: TagFormState) {
  const base = buildCreateRequest(form);
  return {
    ...base,
    changelog: form.changelog.trim() || undefined,
  };
}
