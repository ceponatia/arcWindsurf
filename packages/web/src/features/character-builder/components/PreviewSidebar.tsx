import React from 'react';
import { PreviewSidebarLayout, EntityUsagePanel } from '@minimal-rpg/ui';
import { PERSONALITY_DIMENSIONS } from '@minimal-rpg/schemas';
import type { FormState } from '../types.js';
import { RadarChart } from './RadarChart.js';
import { useEntityUsage } from '../../../hooks/useEntityUsage.js';

interface PreviewSidebarProps {
  form: FormState;
  disabled: boolean;
  saving: boolean;
  generating?: boolean;
  error: string | null;
  success: string | null;
  loadError: string | null;
  onSave: () => void;
  onGenerate?: () => void;
  onCancel?: (() => void) | undefined;
  onDelete?: (() => void | Promise<void>) | undefined;
  isEditing?: boolean | undefined;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = (props) => {
  const {
    form,
    disabled,
    saving,
    generating = false,
    error,
    success,
    loadError,
    onSave,
    onGenerate,
    onCancel,
    onDelete,
    isEditing,
  } = props;

  return (
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
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 space-y-4">
        {/* Header with Avatar */}
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden border-2 border-slate-600">
            {form.profilePic ? (
              <img src={form.profilePic} alt={form.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {form.gender === 'female' ? '♀' : form.gender === 'male' ? '♂' : '?'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate text-slate-100">
              {form.name || 'Unnamed Character'}
            </div>
            <div className="text-xs text-slate-400 font-mono mb-1">{form.id || 'ID: —'}</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {form.age && (
                <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  Age: {form.age}
                </span>
              )}
              {form.race && (
                <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  {form.race}
                </span>
              )}
              {form.alignment && (
                <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  {form.alignment}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        {form.summary && (
          <div className="text-sm text-slate-300 italic border-l-2 border-slate-600 pl-3 py-1">
            "{form.summary}"
          </div>
        )}

        {/* Personality Radar */}
        <div className="flex justify-center py-2 bg-slate-900/30 rounded-lg">
          <RadarChart
            data={PERSONALITY_DIMENSIONS.map((dim) => ({
              label: dim.charAt(0).toUpperCase() + dim.slice(1),
              value: form.personalityMap.dimensions.find((d) => d.dimension === dim)?.score ?? 0.5,
            }))}
            size={160}
          />
        </div>

        {/* Key Stats / Details */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Key Details
          </div>
          {form.personality && (
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Traits:</span> {form.personality}
            </div>
          )}
          {form.details.some((d) => d.label && d.value) && (
            <ul className="text-xs text-slate-300 space-y-1">
              {form.details
                .filter((d) => d.label && d.value)
                .slice(0, 3)
                .map((d, idx) => (
                  <li key={`preview-detail-${idx}`} className="flex justify-between">
                    <span className="text-slate-500">{d.label}:</span>
                    <span>{d.value}</span>
                  </li>
                ))}
              {form.details.filter((d) => d.label && d.value).length > 3 && (
                <li className="text-slate-500 italic">
                  +{form.details.filter((d) => d.label && d.value).length - 3} more...
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Usage Tracker */}
        {isEditing && form.id && (
          <div className="pt-2 border-t border-slate-700">
            <UsageTracker entityId={form.id} />
          </div>
        )}
      </div>

      {onGenerate && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={onGenerate}
            disabled={disabled || generating}
            className="w-full px-4 py-2 text-sm font-medium text-slate-200 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {generating ? 'Generating…' : '✨ Fill Missing Fields'}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Randomly generates missing fields while preserving your existing data.
          </p>
        </div>
      )}
    </PreviewSidebarLayout>
  );
};

function UsageTracker({ entityId }: { entityId: string }) {
  const { usage, loading, error } = useEntityUsage(entityId, 'character');

  return (
    <EntityUsagePanel
      entityType="character"
      sessions={usage?.sessions ?? []}
      totalCount={usage?.totalCount ?? 0}
      loading={loading}
      error={error}
      maxDisplay={3}
    />
  );
}
