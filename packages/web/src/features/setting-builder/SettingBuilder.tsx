import React, { useState, useEffect } from 'react';
import { SettingProfileSchema, type SettingProfile } from '@minimal-rpg/schemas';
import { mapZodErrorsToFields, getInlineErrorProps } from '@minimal-rpg/utils';
import { splitList } from '../shared/stringLists.js';
import { getSetting, saveSetting, deleteSetting } from '../../shared/api/client.js';
import { PreviewSidebar } from './components/PreviewSidebar.js';

interface FormState {
  id: string;
  name: string;
  lore: string;
  themes: string;
  /** User-defined tags as comma-separated string */
  tags: string;
}

const initialState: FormState = {
  id: '',
  name: '',
  lore: '',
  themes: '',
  tags: '',
};

type FormKey = keyof FormState;
type FormFieldErrors = Partial<Record<FormKey, string>>;

export const SettingBuilder: React.FC<{
  id?: string | null;
  onSave?: () => void;
  onCancel?: () => void;
}> = ({ id, onSave: onSaveCallback, onCancel }) => {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  /** Whether we're viewing/editing an existing setting vs creating new */
  const isEditing = Boolean(id);
  /** Whether fields are unlocked for editing (always true for new, toggled for existing) */
  const [isInEditMode, setIsInEditMode] = useState(!isEditing);
  /** Track if user has saved at least once this session */
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (id) {
      // Reset edit mode state when loading existing entity
      setIsInEditMode(false);
      setHasSaved(false);
      getSetting(id)
        .then((data) => {
          setForm({
            id: data.id,
            name: data.name,
            lore: data.lore,
            themes: (data.themes ?? []).join(', '),
            tags: (data.tags ?? []).join(', '),
          });
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load setting');
        });
    } else {
      // New entity starts in edit mode
      setForm(initialState);
      setIsInEditMode(true);
      setHasSaved(false);
    }
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const themes = splitList(form.themes);
    const tags = splitList(form.tags);

    const profile: SettingProfile = {
      id: form.id.trim(),
      name: form.name.trim(),
      lore: form.lore.trim(),
      themes: themes.length > 0 ? themes : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    // Client-side validation
    const validation = SettingProfileSchema.safeParse(profile);
    if (!validation.success) {
      const fieldMap = mapZodErrorsToFields<FormKey>(validation.error, {
        pathToField: (path) => {
          const key = path[0] as string;
          if (key in initialState) return key as FormKey;
          return undefined as unknown as FormKey;
        },
      });
      setFieldErrors(fieldMap);
      setError('Please fix the highlighted fields.');
      setSaving(false);
      return;
    }

    try {
      await saveSetting(profile);
      setSuccess('Saved successfully');
      setHasSaved(true);
      if (onSaveCallback) onSaveCallback();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setError(null);
    await deleteSetting(id);
    window.location.hash = '';
  }

  const disabled = saving || !isInEditMode;

  // Determine close button label based on edit state
  // - If not in edit mode (viewing): "Close"
  // - If in edit mode and have saved: "Close"
  // - If in edit mode and haven't saved (unsaved changes): "Cancel"
  const closeLabel = !isInEditMode || hasSaved ? 'Close' : 'Cancel';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">Setting Builder</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Details</div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">ID</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.id}
                  onChange={(e) => update('id', e.target.value)}
                  disabled={disabled}
                  {...getInlineErrorProps('id', fieldErrors.id)}
                />
                {fieldErrors.id && (
                  <span id="id-error" className="text-sm text-red-400">
                    {fieldErrors.id}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Name</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  disabled={disabled}
                  {...getInlineErrorProps('name', fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <span id="name-error" className="text-sm text-red-400">
                    {fieldErrors.name}
                  </span>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Themes (comma separated)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.themes}
                  onChange={(e) => update('themes', e.target.value)}
                  disabled={disabled}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Tags (comma separated)</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.tags}
                  onChange={(e) => update('tags', e.target.value)}
                  disabled={disabled}
                  placeholder="tags can be used to filter and search settings"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Lore</span>
                <textarea
                  className="min-h-[200px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  value={form.lore}
                  onChange={(e) => update('lore', e.target.value)}
                  disabled={disabled}
                  {...getInlineErrorProps('lore', fieldErrors.lore)}
                />
                {fieldErrors.lore && (
                  <span id="lore-error" className="text-sm text-red-400">
                    {fieldErrors.lore}
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <PreviewSidebar
          form={form}
          disabled={disabled}
          saving={saving}
          error={error}
          success={success}
          onSave={() => void onSave()}
          onCancel={onCancel}
          onEdit={() => setIsInEditMode(true)}
          onDelete={handleDelete}
          isEditing={isEditing}
          isInEditMode={isInEditMode}
          closeLabel={closeLabel}
        />
      </div>
    </div>
  );
};
