import type { TagCategory, TagVisibility } from '@minimal-rpg/schemas';

import { CATEGORY_LABELS, type TagFormState, type TagUpdateFieldFn } from '../types.js';

const VISIBILITY_OPTIONS: { value: TagVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
];

interface BasicsSectionProps {
  formState: TagFormState;
  updateField: TagUpdateFieldFn;
}

export function BasicsSection({ formState, updateField }: BasicsSectionProps) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Basics</h3>

      {/* Name */}
      <div>
        <label htmlFor="tag-name" className="block text-sm font-medium text-gray-300 mb-1">
          Name
        </label>
        <input
          id="tag-name"
          type="text"
          value={formState.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Verbose Narrator"
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="tag-category" className="block text-sm font-medium text-gray-300 mb-1">
          Category
        </label>
        <select
          id="tag-category"
          value={formState.category}
          onChange={(e) => updateField('category', e.target.value as TagCategory)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Prompt Text */}
      <div>
        <label htmlFor="tag-prompt" className="block text-sm font-medium text-gray-300 mb-1">
          Prompt Text
        </label>
        <textarea
          id="tag-prompt"
          value={formState.promptText}
          onChange={(e) => updateField('promptText', e.target.value)}
          placeholder="Write detailed narration with vivid sensory descriptions..."
          rows={4}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-y"
        />
        <p className="text-xs text-gray-400 mt-1">
          The instruction that will be injected into the LLM prompt when this tag is active.
        </p>
      </div>

      {/* Visibility */}
      <div>
        <label htmlFor="tag-visibility" className="block text-sm font-medium text-gray-300 mb-1">
          Visibility
        </label>
        <select
          id="tag-visibility"
          value={formState.visibility}
          onChange={(e) => updateField('visibility', e.target.value as TagVisibility)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {VISIBILITY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
