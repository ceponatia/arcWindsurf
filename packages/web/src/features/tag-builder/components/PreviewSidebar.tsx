import { PreviewSidebarLayout } from '@minimal-rpg/ui';
import { CATEGORY_LABELS, type TagFormState } from '../types.js';

interface PreviewSidebarProps {
  formState: TagFormState;
  isEditing: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: (() => void | Promise<void>) | undefined;
  error?: string | null;
  success?: string | null;
}

export function PreviewSidebar({
  formState,
  isEditing,
  isSaving,
  onSave,
  onCancel,
  onDelete,
  error,
  success,
}: PreviewSidebarProps) {
  const isValid = formState.name.trim().length > 0 && formState.promptText.trim().length > 0;

  return (
    <PreviewSidebarLayout
      title="Preview"
      saveLabel={isEditing ? 'Update Tag' : 'Create Tag'}
      deleteLabel="Delete Tag"
      deleteTitle="Delete Tag"
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
      disabled={!isValid || isSaving}
      saving={isSaving}
      isEditing={isEditing}
      error={error ?? null}
      success={success ?? null}
      itemName={formState.name || 'this tag'}
    >
      {/* Tag Card Preview */}
      <div className="p-3 bg-gray-700/50 rounded border border-gray-600 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-white">
              {formState.name || <span className="text-gray-500 italic">Untitled Tag</span>}
            </h4>
            <span className="text-xs text-gray-400">{CATEGORY_LABELS[formState.category]}</span>
          </div>
          <span
            className={`px-2 py-0.5 text-xs rounded ${
              formState.activationMode === 'always'
                ? 'bg-blue-600/30 text-blue-300'
                : 'bg-amber-600/30 text-amber-300'
            }`}
          >
            {formState.activationMode === 'always' ? 'Always' : 'Conditional'}
          </span>
        </div>

        {/* Prompt Preview */}
        <div className="text-sm text-gray-300">
          {formState.promptText ? (
            <p className="line-clamp-4">{formState.promptText}</p>
          ) : (
            <p className="text-gray-500 italic">No prompt text defined</p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 bg-gray-600 rounded text-gray-300">
            Target: {formState.targetType}
          </span>
          <span className="px-2 py-0.5 bg-gray-600 rounded text-gray-300">
            {formState.visibility}
          </span>
          {formState.activationMode === 'conditional' && (
            <span className="px-2 py-0.5 bg-gray-600 rounded text-gray-300">
              {formState.triggers.length} trigger(s)
            </span>
          )}
        </div>
      </div>

      {/* Validation Status */}
      <div className="text-sm mt-2">
        {!formState.name.trim() && <p className="text-amber-400">⚠ Name is required</p>}
        {!formState.promptText.trim() && (
          <p className="text-amber-400">⚠ Prompt text is required</p>
        )}
        {formState.activationMode === 'conditional' && formState.triggers.length === 0 && (
          <p className="text-amber-400">⚠ Conditional tags need at least one trigger</p>
        )}
        {isValid && <p className="text-green-400">✓ Ready to save</p>}
      </div>
    </PreviewSidebarLayout>
  );
}
