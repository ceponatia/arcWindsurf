import React from 'react';
import { PreviewSidebarLayout } from '@minimal-rpg/ui';
import type { ItemCategory } from '@minimal-rpg/schemas';

interface FormState {
  id: string;
  name: string;
  category: ItemCategory;
  type: string;
  description: string;
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
  onDelete?: (() => void | Promise<void>) | undefined;
  isEditing?: boolean | undefined;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  form,
  disabled,
  saving,
  error,
  success,
  onSave,
  onCancel,
  onDelete,
  isEditing,
}) => (
  <PreviewSidebarLayout
    title="Preview"
    saveLabel={isEditing ? 'Save Item' : 'Create Item'}
    deleteLabel="Delete Item"
    deleteTitle="Delete Item"
    onSave={onSave}
    onCancel={onCancel}
    onDelete={onDelete}
    disabled={disabled}
    saving={saving}
    isEditing={isEditing}
    error={error}
    success={success}
    itemName={form.name || 'this item'}
  >
    <div className="text-lg font-semibold">{form.name || 'Unnamed Item'}</div>
    <div className="text-sm text-slate-400">ID: {form.id || '—'}</div>
    <div className="text-xs text-slate-500">Category: {form.category}</div>
    <div className="text-xs text-slate-500">Type: {form.type || '—'}</div>
    <div className="text-sm text-slate-300 whitespace-pre-wrap">
      {form.description || 'No description yet.'}
    </div>
    {form.tags && <div className="text-xs text-slate-500 mt-2">Tags: {form.tags}</div>}
  </PreviewSidebarLayout>
);
