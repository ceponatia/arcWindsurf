import { useState, useEffect, useCallback } from 'react';
import type { SettingBackground } from '@minimal-rpg/schemas';
import { getSetting } from '../../../shared/api/client.js';
import { initialFormState, mapProfileToForm } from '../transformers.js';
import type { SettingFormState, FormFieldErrors, FormKey } from '../types.js';

export const useSettingBuilderForm = (id?: string | null) => {
  const [form, setForm] = useState<SettingFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setForm(initialFormState);
      return;
    }

    setLoading(true);
    setLoadError(null);

    getSetting(id)
      .then((profile: SettingBackground) => {
        setForm(mapProfileToForm(profile));
      })
      .catch((err: unknown) => {
        console.error(err);
        setLoadError('Failed to load setting');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const updateField = useCallback(
    <K extends FormKey>(key: K, value: SettingFormState[K]) => {
      setForm((prev) => {
        const next = { ...prev };
        Object.defineProperty(next, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
        return next;
      });
      // Clear error for this field if it exists
      const currentError = Object.getOwnPropertyDescriptor(fieldErrors, key)?.value as string | undefined;
      if (currentError) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          Reflect.deleteProperty(next, key);
          return next;
        });
      }
    },
    [fieldErrors]
  );

  return {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    updateField,
    loading,
    loadError,
  };
};
