import React from 'react';
import { PreviewSidebarLayout } from '@minimal-rpg/ui';

interface FormState {
  id: string;
  name: string;
  lore: string;
  themes: string;
  tags: string;
}

interface PreviewSidebarProps {
  form: FormState;
  disabled: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onSave: () => void;
  onCancel?: (() => void) | undefined;
  onEdit?: (() => void) | undefined;
  onDelete?: (() => void | Promise<void>) | undefined;
  isEditing?: boolean | undefined;
  isInEditMode?: boolean | undefined;
  closeLabel?: string | undefined;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  form,
  disabled,
  saving,
  error,
  success,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  isEditing,
  isInEditMode,
  closeLabel,
}) => (
  <PreviewSidebarLayout
    title="Preview"
    saveLabel="Save Setting"
    deleteLabel="Delete Setting"
    deleteTitle="Delete Setting"
    closeLabel={closeLabel}
    onSave={onSave}
    onCancel={onCancel}
    onEdit={onEdit}
    onDelete={onDelete}
    disabled={disabled}
    saving={saving}
    isEditing={isEditing}
    isInEditMode={isInEditMode}
    error={error}
    success={success}
    itemName={form.name || 'this setting'}
  >
    <div className="text-lg font-semibold">{form.name || 'Unnamed Setting'}</div>
    <div className="text-sm text-slate-400">ID: {form.id || '—'}</div>
    <div className="text-sm text-slate-300 whitespace-pre-wrap">{form.lore || 'No lore yet.'}</div>
    {form.themes && <div className="text-xs text-slate-500 mt-2">Themes: {form.themes}</div>}
    {form.tags && <div className="text-xs text-slate-500">Tags: {form.tags}</div>}
  </PreviewSidebarLayout>
);
