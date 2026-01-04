import React from 'react';
import { BuilderActionPanel } from '../forms/BuilderActionPanel.js';
import type { PreviewSidebarLayoutProps } from './types.js';

/**
 * Shared layout for builder preview sidebars.
 * Provides consistent positioning, card styling, and action buttons.
 * Each builder provides its own preview content as children.
 *
 * @example
 * ```tsx
 * <PreviewSidebarLayout
 *   title="Preview"
 *   saveLabel="Save Character"
 *   onSave={handleSave}
 *   onCancel={onCancel}
 *   onDelete={handleDelete}
 *   isEditing={isEditing}
 *   saving={saving}
 *   error={error}
 *   success={success}
 *   itemName={form.name}
 * >
 *   <div className="text-lg font-semibold">{form.name || 'Unnamed'}</div>
 *   <div className="text-sm text-slate-400">ID: {form.id || '—'}</div>
 * </PreviewSidebarLayout>
 * ```
 */
export const PreviewSidebarLayout: React.FC<PreviewSidebarLayoutProps> = ({
  children,
  title = 'Preview',
  saveLabel = 'Save',
  deleteLabel = 'Delete',
  deleteTitle = 'Confirm Delete',
  closeLabel = 'Close',
  editLabel = 'Edit',
  onSave,
  onCancel,
  onEdit,
  onDelete,
  disabled = false,
  saving = false,
  isInEditMode = true,
  isEditing = false,
  error = null,
  loadError = null,
  success = null,
  itemName,
}) => {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-0">
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">{title}</div>
          <div className="p-4 space-y-2">{children}</div>
        </div>
        <BuilderActionPanel
          saveLabel={saveLabel}
          deleteLabel={deleteLabel}
          deleteTitle={deleteTitle}
          closeLabel={closeLabel}
          editLabel={editLabel}
          onSave={onSave}
          onCancel={onCancel}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={disabled}
          saving={saving}
          isInEditMode={isInEditMode}
          isEditing={isEditing}
          error={error}
          loadError={loadError}
          success={success}
          itemName={itemName}
        />
      </div>
    </div>
  );
};
