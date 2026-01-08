import React from 'react';

export interface StudioHeaderProps {
  characterName: string;
  completion: number;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSave: () => void;
  onCancel?: () => void;
  isEditing: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  characterName,
  completion,
  isDirty,
  saveStatus,
  onSave,
  onCancel,
  isEditing,
}) => {
  return (
    <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">
          {isEditing ? `Editing: ${characterName}` : 'Create Character'}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <div className="text-xs text-slate-500">
            {completion}% complete
          </div>
          <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isDirty && (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Character'}
        </button>
      </div>
    </header>
  );
};
