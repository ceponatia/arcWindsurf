import React, { useState } from 'react';
import type { BuilderActionPanelProps } from './types.js';

export const BuilderActionPanel: React.FC<BuilderActionPanelProps> = ({
  saveLabel = 'Save',
  deleteLabel = 'Delete',
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
  deleteTitle = 'Confirm Delete',
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="mt-4 space-y-2 max-w-[50%] ml-auto">
        {/* Edit button - shown when viewing existing item and not in edit mode */}
        {isEditing && !isInEditMode && onEdit && (
          <button
            type="button"
            className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition bg-violet-600 hover:bg-violet-500 text-white"
            onClick={onEdit}
          >
            {editLabel}
          </button>
        )}
        {/* Save button - only shown in edit mode */}
        {isInEditMode && (
          <button
            type="button"
            className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${
              disabled
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            disabled={disabled}
            onClick={onSave}
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        )}
        {/* Delete button - shown for existing items in edit mode */}
        {isEditing && isInEditMode && onDelete && (
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className={`w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isDeleting
                ? 'bg-red-900 text-red-300 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
            disabled={disabled || isDeleting}
          >
            {isDeleting ? 'Deleting…' : deleteLabel}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            disabled={disabled}
          >
            {closeLabel}
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-400">Error: {error}</p>}
        {loadError && !error && <p className="mt-2 text-sm text-amber-300">{loadError}</p>}
        {success && <p className="mt-2 text-sm text-emerald-400">{success}</p>}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">{deleteTitle}</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete{itemName ? ` "${itemName}"` : ' this item'}?
            </p>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
