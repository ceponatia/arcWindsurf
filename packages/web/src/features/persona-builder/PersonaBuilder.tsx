import React, { useState, useEffect } from 'react';
import { PersonaProfileSchema, type PersonaProfile } from '@minimal-rpg/schemas';
import { mapZodErrorsToFields } from '@minimal-rpg/utils';
import { EntityUsagePanel } from '@minimal-rpg/ui';
import { useEntityUsage } from '../../hooks/useEntityUsage.js';
import { persistPersona, removePersona, loadPersona } from './api.js';
import { usePersonaBuilderForm, buildProfileFromForm } from './hooks/usePersonaBuilderForm.js';
import type { FormKey, FormFieldErrors } from './types.js';

interface PersonaBuilderProps {
  /** Persona ID to edit (undefined/null for new) */
  id?: string | null;
  /** Callback on successful save */
  onSave?: () => void;
  /** Callback on cancel */
  onCancel?: () => void;
}

/**
 * Section wrapper component for consistent styling
 */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
    <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">{title}</h3>
    {children}
  </div>
);

/**
 * Form field wrapper for consistent label/input styling
 */
const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}> = ({ label, required, error, hint, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-300">
      {label}
      {required && <span className="text-rose-400 ml-1">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
    {error && <p className="text-xs text-rose-400">{error}</p>}
  </div>
);

/**
 * PersonaBuilder - Create or edit player character personas.
 * Simpler than CharacterBuilder - no personality or detailed fields.
 */
export function PersonaBuilder(props: PersonaBuilderProps) {
  const { id, onSave, onCancel } = props;
  const [existingPersona, setExistingPersona] = useState<PersonaProfile | undefined>(undefined);
  const [loadingPersona, setLoadingPersona] = useState(false);

  // Load existing persona when id changes
  useEffect(() => {
    if (!id) {
      setExistingPersona(undefined);
      return;
    }

    setLoadingPersona(true);
    loadPersona(id, undefined)
      .then((persona) => {
        if (persona) {
          setExistingPersona(persona);
        }
      })
      .catch((err) => {
        console.error('Failed to load persona:', err);
      })
      .finally(() => {
        setLoadingPersona(false);
      });
  }, [id]);

  const { formState, errors, setErrors, updateField } = usePersonaBuilderForm(existingPersona);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMessage('');
    setErrors({});

    try {
      const profile = buildProfileFromForm(formState);
      const result = PersonaProfileSchema.safeParse(profile);

      if (!result.success) {
        const fieldMap = mapZodErrorsToFields<FormKey>(result.error, {
          pathToField: (path: (string | number)[]) => {
            const p = path.map(String);
            const top: Record<string, FormKey> = {
              id: 'id',
              name: 'name',
              age: 'age',
              gender: 'gender',
              summary: 'summary',
              appearance: 'appearance',
            };
            const key = p[0];
            if (!key) return undefined;
            return Object.hasOwn(top, key) ? top[key] : undefined;
          },
        });
        setErrors(fieldMap as FormFieldErrors);
        setSaveStatus('error');
        setErrorMessage('Validation failed. Please check all fields.');
        return;
      }

      await persistPersona(result.data);
      setSaveStatus('saved');
      if (onSave) {
        onSave();
      }
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!existingPersona) return;
    if (!window.confirm(`Delete persona "${existingPersona.name}"?`)) return;

    try {
      await removePersona(existingPersona.id);
      if (onSave) {
        onSave(); // Refresh the list
      }
      if (onCancel) {
        onCancel(); // Go back to library
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loadingPersona) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-400">Loading persona...</p>
      </div>
    );
  }

  const inputClasses =
    'w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';
  const textareaClasses =
    'w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">
        {existingPersona ? 'Edit Persona' : 'Create Persona'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Form - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info Section */}
          <Section title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="ID" required error={errors.id}>
                <input
                  type="text"
                  value={formState.id}
                  onChange={(e) => {
                    updateField('id', e.target.value);
                  }}
                  disabled={!!existingPersona}
                  placeholder="unique-persona-id"
                  className={inputClasses}
                />
              </Field>

              <Field label="Name" required error={errors.name}>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => {
                    updateField('name', e.target.value);
                  }}
                  placeholder="Character name"
                  className={inputClasses}
                />
              </Field>

              <Field label="Age" error={errors.age}>
                <input
                  type="number"
                  value={formState.age}
                  onChange={(e) => {
                    updateField('age', parseInt(e.target.value, 10));
                  }}
                  placeholder="25"
                  min={0}
                  max={999}
                  className={inputClasses}
                />
              </Field>

              <Field label="Gender" error={errors.gender}>
                <input
                  type="text"
                  value={formState.gender}
                  onChange={(e) => {
                    updateField('gender', e.target.value);
                  }}
                  placeholder="e.g., female, male, non-binary"
                  className={inputClasses}
                />
              </Field>
            </div>
          </Section>

          {/* Summary Section */}
          <Section title="Summary">
            <Field
              label="Summary"
              required
              error={errors.summary}
              hint={`${formState.summary.length}/500 characters`}
            >
              <textarea
                value={formState.summary}
                onChange={(e) => {
                  updateField('summary', e.target.value);
                }}
                maxLength={500}
                rows={4}
                placeholder="A brief description of your persona's background and personality..."
                className={textareaClasses}
              />
            </Field>
          </Section>

          {/* Appearance Section */}
          <Section title="Appearance">
            <Field label="Physical Appearance" error={errors.appearance}>
              <textarea
                value={formState.appearance}
                onChange={(e) => {
                  updateField('appearance', e.target.value);
                }}
                rows={6}
                placeholder="Describe your character's physical appearance, including height, build, hair, eyes, distinguishing features..."
                className={textareaClasses}
              />
            </Field>
          </Section>
        </div>

        {/* Sidebar - 1 column */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-4 sticky top-4">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">
              Actions
            </h3>

            {/* Status messages */}
            {saveStatus === 'saved' && (
              <div className="p-3 bg-emerald-900/50 border border-emerald-700 rounded-md">
                <p className="text-sm text-emerald-300">Persona saved successfully!</p>
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-rose-900/50 border border-rose-700 rounded-md">
                <p className="text-sm text-rose-300">{errorMessage}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  void handleSave();
                }}
                disabled={saveStatus === 'saving'}
                className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Persona'}
              </button>

              {existingPersona && (
                <button
                  type="button"
                  onClick={() => {
                    void handleDelete();
                  }}
                  className="w-full px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-md transition-colors"
                >
                  Delete Persona
                </button>
              )}

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Preview */}
            {formState.name && (
              <div className="pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Preview</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <p className="font-medium text-slate-200">{formState.name}</p>
                  {Number(formState.age) > 0 && formState.gender && (
                    <p className="text-slate-400">
                      {formState.age} years old · {formState.gender}
                    </p>
                  )}
                  {Number(formState.age) > 0 && !formState.gender && (
                    <p className="text-slate-400">{formState.age} years old</p>
                  )}
                  {!formState.age && formState.gender && (
                    <p className="text-slate-400">{formState.gender}</p>
                  )}
                  {formState.summary && (
                    <p className="text-slate-500 text-xs mt-2 line-clamp-3">{formState.summary}</p>
                  )}
                </div>
              </div>
            )}

            {/* Usage Tracking */}
            {id && (
              <div className="pt-4 border-t border-slate-700">
                <UsageTracker entityId={id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageTracker({ entityId }: { entityId: string }) {
  const { usage, loading, error } = useEntityUsage(entityId, 'persona');

  return (
    <EntityUsagePanel
      entityType="persona"
      sessions={usage?.sessions ?? []}
      totalCount={usage?.totalCount ?? 0}
      loading={loading}
      error={error}
      maxDisplay={3}
    />
  );
}
