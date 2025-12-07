import { useCallback, useEffect, useState } from 'react';

import { persistTag, removeTag, updateTag } from './api.js';
import {
  ActivationSection,
  BasicsSection,
  PreviewSidebar,
  TriggersSection,
} from './components/index.js';
import {
  buildCreateRequest,
  buildUpdateRequest,
  useTagBuilderForm,
} from './hooks/useTagBuilderForm.js';
import type { TriggerFormEntry } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

interface TagBuilderProps {
  id?: string | null;
  onCancel?: () => void;
  onSaved?: (id: string) => void;
}

export const TagBuilder: React.FC<TagBuilderProps> = ({ id, onCancel, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    formState,
    loading,
    loadError,
    updateField,
    addTriggerEntry,
    removeTriggerEntry,
    updateTriggerEntry,
    reset,
  } = useTagBuilderForm(id ?? null);

  // Reset form when id changes to null (new tag mode)
  useEffect(() => {
    if (!id) {
      reset();
    }
  }, [id, reset]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (id) {
        const request = buildUpdateRequest(formState);
        await updateTag(id, request);
        setSuccess('Tag saved successfully');
        onSaved?.(id);
      } else {
        const request = buildCreateRequest(formState);
        const result = await persistTag(request);
        setSuccess('Tag created successfully');
        onSaved?.(result.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  }, [id, formState, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setError(null);

    try {
      await removeTag(id);
      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  }, [id, onCancel]);

  const handleUpdateTrigger = useCallback(
    (index: number, field: keyof TriggerFormEntry, value: string | boolean) => {
      updateTriggerEntry(index, field, value);
    },
    [updateTriggerEntry]
  );

  const isEditing = Boolean(id);
  const disabled = saving || loading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{isEditing ? 'Edit Tag' : 'New Tag'}</h2>
        {isEditing && formState.isBuiltIn && (
          <span className="px-2 py-1 text-xs bg-amber-600/20 text-amber-300 rounded">
            Built-in (read-only)
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading tag…</p>}
      {loadError && !loading && <p className="text-sm text-amber-300">{loadError}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Form sections */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <BasicsSection formState={formState} updateField={updateField} />
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <ActivationSection formState={formState} updateField={updateField} />
          </div>

          {formState.activationMode === 'conditional' && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <TriggersSection
                triggers={formState.triggers}
                onAdd={addTriggerEntry}
                onRemove={removeTriggerEntry}
                onUpdate={handleUpdateTrigger}
              />
            </div>
          )}

          {/* Delete button for existing tags */}
          {isEditing && !formState.isBuiltIn && (
            <div className="pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={disabled}
                className="px-4 py-2 text-sm bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded border border-red-600/50 transition-colors disabled:opacity-50"
              >
                Delete Tag
              </button>
            </div>
          )}
        </div>

        {/* Right column: Preview */}
        <PreviewSidebar
          formState={formState}
          isEditing={isEditing}
          isSaving={saving}
          onSave={() => void handleSave()}
          onCancel={onCancel ?? noop}
          onDelete={isEditing ? () => void handleDelete() : undefined}
          error={error}
          success={success}
        />
      </div>
    </div>
  );
};
