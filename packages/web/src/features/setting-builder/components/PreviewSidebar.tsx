import React from 'react';
import { PreviewSidebarLayout } from '@minimal-rpg/ui';
import type { SettingFormState } from '../types.js';

interface PreviewSidebarProps {
  form: SettingFormState;
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
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold text-slate-200">{form.name || 'Unnamed Setting'}</div>
      </div>

      {form.tone && (
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tone</span>
          <div className="text-sm text-slate-300">{form.tone}</div>
        </div>
      )}

      <div>
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lore</span>
        <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
          {form.lore || 'No lore yet.'}
        </div>
      </div>

      {(form.themes || form.tags) && (
        <div className="space-y-1">
          {form.themes && (
            <div className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Themes:</span> {form.themes}
            </div>
          )}
          {form.tags && (
            <div className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Tags:</span> {form.tags}
            </div>
          )}
        </div>
      )}

      {(form.safetyRating || form.excludedTopics || form.contentWarnings) && (
        <div className="pt-2 border-t border-slate-800">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Safety
          </span>
          <div className="mt-1 space-y-1">
            {form.safetyRating && (
              <div className="text-xs text-slate-300">
                <span className="text-slate-500">Rating:</span> {form.safetyRating}
              </div>
            )}
            {form.contentWarnings && (
              <div className="text-xs text-amber-400/80">
                <span className="text-amber-500/60">Warnings:</span> {form.contentWarnings}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </PreviewSidebarLayout>
);
