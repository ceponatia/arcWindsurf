import React from 'react';
import { Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { useSignals } from '@preact/signals-react/runtime';
import { completionScore, requiredFieldsCompletion } from '../signals.js';

export interface StudioHeaderProps {
  characterName: string;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDeleting?: boolean;
  onSave: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  isEditing: boolean;
  hasErrors?: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  characterName,
  isDirty,
  saveStatus,
  isDeleting,
  onSave,
  onDelete,
  onCancel,
  isEditing,
  hasErrors,
}) => {
  useSignals();

  const score = completionScore.value;
  const fields = requiredFieldsCompletion.value;

  const missingFields = Object.entries(fields)
    .filter((entry) => !entry[1])
    .map(([field]) => field);

  const getStatusColor = () => {
    if (score === 100) return 'bg-emerald-500';
    if (score === 0) return 'bg-orange-500';
    return 'bg-violet-500';
  };

  const getStatusTextColor = () => {
    if (score === 100) return 'text-emerald-400';
    if (score === 0) return 'text-orange-400';
    return 'text-slate-400';
  };

  return (
    <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            {isEditing ? `Editing: ${characterName}` : 'Create Character'}
          </h1>
          <div className="flex items-center gap-3 mt-1 group relative">
            <div className={`text-xs ${getStatusTextColor()} font-medium uppercase tracking-wider`}>
              {score === 100 ? (
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </div>
              ) : (
                `${score}% complete`
              )}
            </div>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStatusColor()} transition-all duration-500 ease-out`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Tooltip for missing fields */}
            {missingFields.length > 0 && (
              <div className="absolute top-full mt-2 left-0 z-50 w-48 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                  Missing Required Fields
                </div>
                <div className="space-y-1">
                  {missingFields.map((field) => (
                    <div
                      key={field}
                      className="text-xs text-slate-300 flex items-center gap-1.5 capitalize"
                    >
                      <div className="w-1 h-1 rounded-full bg-orange-500" />
                      {field}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {hasErrors && <span className="text-xs text-red-400">Please fix validation errors</span>}
        {saveStatus === 'saved' && (
          <span className="text-xs text-emerald-400">Character saved!</span>
        )}
        {saveStatus === 'error' && <span className="text-xs text-red-400">Save failed</span>}
        {isDirty && saveStatus === 'idle' && (
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

        {isEditing && onDelete && (
          <button
            onClick={onDelete}
            disabled={(isDeleting ?? false) || saveStatus === 'saving'}
            className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-50 transition-colors"
            title="Delete Character"
          >
            {isDeleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>
        )}

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saveStatus === 'saving' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            'Save Character'
          )}
        </button>
      </div>
    </header>
  );
};
