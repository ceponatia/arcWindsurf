import React from 'react';
import type { FormState } from '../types.js';

interface PreviewSidebarProps {
  form: FormState;
  disabled: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  loadError: string | null;
  onSave: () => void;
  onCancel?: () => void;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  form,
  disabled,
  saving,
  error,
  success,
  loadError,
  onSave,
  onCancel,
}) => (
  <div className="lg:col-span-1">
    <div className="sticky top-0">
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Preview</div>
        <div className="p-4 space-y-2">
          <div className="text-lg font-semibold">{form.name || 'Unnamed Character'}</div>
          <div className="text-sm text-slate-400">ID: {form.id || '—'}</div>
          <div className="text-sm text-slate-400">Age: {String(form.age || '')}</div>
          <div className="text-sm text-slate-300">{form.summary || 'No summary yet.'}</div>
          {form.personality && (
            <div className="text-sm text-slate-300">Personality: {form.personality}</div>
          )}
          {form.details.some((d) => d.label && d.value) && (
            <div className="text-sm text-slate-300 space-y-1">
              <div>Details:</div>
              <ul className="list-disc pl-4 text-slate-400">
                {form.details
                  .filter((d) => d.label && d.value)
                  .slice(0, 3)
                  .map((d, idx) => (
                    <li key={`preview-detail-${idx}`}>
                      {d.label}: {d.value}
                    </li>
                  ))}
                {form.details.filter((d) => d.label && d.value).length > 3 && <li>…</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <button
          className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
            disabled
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          disabled={disabled}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save Character'}
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
        {loadError && !error && <p className="mt-2 text-sm text-amber-300">{loadError}</p>}
        {success && <p className="mt-2 text-sm text-emerald-400">{success}</p>}
      </div>
    </div>
  </div>
);
