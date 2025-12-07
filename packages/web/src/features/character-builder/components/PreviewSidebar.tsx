import React from 'react';
import { PreviewSidebarLayout } from '@minimal-rpg/ui';
import type { FormState } from '../types.js';

interface PreviewSidebarProps {
  form: FormState;
  disabled: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  loadError: string | null;
  onSave: () => void;
  onCancel?: (() => void) | undefined;
  onDelete?: (() => void | Promise<void>) | undefined;
  isEditing?: boolean | undefined;
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
  onDelete,
  isEditing,
}) => (
  <PreviewSidebarLayout
    title="Preview"
    saveLabel="Save Character"
    deleteLabel="Delete Character"
    deleteTitle="Delete Character"
    onSave={onSave}
    onCancel={onCancel}
    onDelete={onDelete}
    disabled={disabled}
    saving={saving}
    isEditing={isEditing}
    error={error}
    loadError={loadError}
    success={success}
    itemName={form.name || 'this character'}
  >
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
  </PreviewSidebarLayout>
);
