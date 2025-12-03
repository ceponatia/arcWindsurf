import React, { useEffect, useState } from 'react';
import { getTag, createTag, updateTag } from '../../shared/api/client.js';
import type { CreateTagRequest } from '@minimal-rpg/schemas';

interface TagBuilderProps {
  id?: string | null;
  onCancel?: () => void;
}

export const TagBuilder: React.FC<TagBuilderProps> = ({ id, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [promptText, setPromptText] = useState('');

  useEffect(() => {
    if (id) {
      setLoading(true);
      setLoadError(null);
      getTag(id)
        .then((tag) => {
          setName(tag.name);
          setShortDescription(tag.shortDescription ?? '');
          setPromptText(tag.promptText);
        })
        .catch((err) => {
          setLoadError(err instanceof Error ? err.message : 'Failed to load tag');
        })
        .finally(() => setLoading(false));
    } else {
      // Reset form for new tag
      setName('');
      setShortDescription('');
      setPromptText('');
    }
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const data: CreateTagRequest = {
      name: name.trim(),
      shortDescription: shortDescription.trim() || undefined,
      promptText: promptText.trim(),
    };

    // Basic validation
    if (!data.name) {
      setError('Name is required');
      setSaving(false);
      return;
    }
    if (!data.promptText) {
      setError('Prompt text is required');
      setSaving(false);
      return;
    }

    try {
      if (id) {
        await updateTag(id, data);
      } else {
        await createTag(data);
      }
      setSuccess('Tag saved.');
      if (onCancel) onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || loading;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-200">{id ? 'Edit Tag' : 'New Tag'}</h2>

      {loading && <p className="text-sm text-slate-400">Loading tag…</p>}
      {loadError && !loading && <p className="text-sm text-amber-300">{loadError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Tag Details</div>
            <div className="p-4 grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Name *</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  disabled={disabled}
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Short Description</span>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  disabled={disabled}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Prompt Text *</span>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[200px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  disabled={disabled}
                  required
                />
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
                <div className="text-lg font-semibold">{name || 'Unnamed Tag'}</div>
                {shortDescription && (
                  <div className="text-sm text-slate-400">{shortDescription}</div>
                )}
                <div className="text-sm text-slate-300 whitespace-pre-wrap">
                  {promptText || 'No prompt text yet.'}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
                  disabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                disabled={disabled}
              >
                {saving ? 'Saving…' : 'Save Tag'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                disabled={disabled}
              >
                Cancel
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
