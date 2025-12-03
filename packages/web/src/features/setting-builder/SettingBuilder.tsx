import React, { useState, useEffect } from 'react';
import {
  SettingProfileSchema,
  type SettingProfile,
  SETTING_TAGS,
  type SettingTag,
} from '@minimal-rpg/schemas';
import { mapZodErrorsToFields, getInlineErrorProps } from '@minimal-rpg/utils';
import { splitList } from '../shared/stringLists.js';
import { getSetting, saveSetting } from '../../shared/api/client.js';

interface FormState {
  id: string;
  name: string;
  lore: string;
  themes: string;
  tags: SettingTag[];
}

const initialState: FormState = {
  id: '',
  name: '',
  lore: '',
  themes: '',
  tags: [],
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

  useEffect(() => {
    if (id) {
      getSetting(id)
        .then((data) => {
          setForm({
            id: data.id,
            name: data.name,
            lore: data.lore,
            themes: (data.themes ?? []).join(', '),
            tags: data.tags ?? [],
          });
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to load setting');
        });
    } else {
      setForm(initialState);
    }
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(tag: SettingTag) {
    setForm((f) => {
      const tags = new Set(f.tags);
      if (tags.has(tag)) {
        tags.delete(tag);
      } else {
        tags.add(tag);
      }
      return { ...f, tags: Array.from(tags) };
    });
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const themes = splitList(form.themes);

    const profile: SettingProfile = {
      id: form.id.trim(),
      name: form.name.trim(),
      lore: form.lore.trim(),
      themes: themes.length > 0 ? themes : undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
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
      setSuccess('Setting saved.');
      if (onSaveCallback) onSaveCallback();
      window.location.hash = '';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Setting Builder</h2>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Details</div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">ID</span>
                <input
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.id}
                  onChange={(e) => update('id', e.target.value)}
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
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
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
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.themes}
                  onChange={(e) => update('themes', e.target.value)}
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {SETTING_TAGS.map((tag) => (
                    <label
                      key={tag}
                      className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded border border-slate-800 cursor-pointer hover:border-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={form.tags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        className="rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-300 capitalize">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Lore</span>
                <textarea
                  className="min-h-[200px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={form.lore}
                  onChange={(e) => update('lore', e.target.value)}
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
        <div className="lg:col-span-1">
          <div className="sticky top-0">
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Preview</div>
              <div className="p-4 space-y-2">
                <div className="text-lg font-semibold">{form.name || 'Unnamed Setting'}</div>
                <div className="text-sm text-slate-400">ID: {form.id || '—'}</div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap">
                  {form.lore || 'No lore yet.'}
                </div>
                {form.themes && (
                  <div className="text-xs text-slate-500 mt-2">Themes: {form.themes}</div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <button
                className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
                  disabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                disabled={disabled}
                onClick={() => {
                  void onSave();
                }}
              >
                {saving ? 'Saving…' : 'Save Setting'}
              </button>
              {error && <p className="mt-2 text-sm text-red-400">Error: {error}</p>}
              {success && <p className="mt-2 text-sm text-emerald-400">{success}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
