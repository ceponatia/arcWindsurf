import type { TagActivationMode, TagTargetType } from '@minimal-rpg/schemas';

import {
  ACTIVATION_MODE_LABELS,
  TARGET_TYPE_LABELS,
  type TagFormState,
  type TagUpdateFieldFn,
} from '../types.js';

interface ActivationSectionProps {
  formState: TagFormState;
  updateField: TagUpdateFieldFn;
}

export function ActivationSection({ formState, updateField }: ActivationSectionProps) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Activation</h3>

      {/* Activation Mode Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Activation Mode</label>
        <div className="flex gap-2">
          {(Object.entries(ACTIVATION_MODE_LABELS) as [TagActivationMode, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  updateField('activationMode', value);
                }}
                className={`flex-1 px-4 py-2 rounded border transition-colors ${
                  formState.activationMode === value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {formState.activationMode === 'always'
            ? 'Always active when bound. Prompt text is cached for efficiency.'
            : 'Evaluated each turn. Requires trigger conditions to activate.'}
        </p>
      </div>

      {/* Target Type */}
      <div>
        <label htmlFor="tag-target" className="block text-sm font-medium text-gray-300 mb-1">
          Target Type
        </label>
        <select
          id="tag-target"
          value={formState.targetType}
          onChange={(e) => {
            updateField('targetType', e.target.value as TagTargetType);
          }}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">What type of entity this tag can be bound to.</p>
      </div>
    </section>
  );
}
