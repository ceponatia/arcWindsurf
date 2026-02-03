import React from 'react';
import type { SettingFormState, SettingFormFieldErrors, SettingFormKey } from '../types.js';

interface SettingRulesFormProps {
  form: SettingFormState;
  fieldErrors: SettingFormFieldErrors;
  updateField: <K extends SettingFormKey>(key: K, value: SettingFormState[K]) => void;
}

export const SettingRulesForm: React.FC<SettingRulesFormProps> = ({ form, updateField }) => {
  return (
    <div className="space-y-4">
      {/* Safety Configuration */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 font-medium text-slate-200">
          Safety & Content Boundaries
        </div>
        <div className="p-4 grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Content Rating</span>
            <select
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.safetyRating}
              onChange={(e) =>
                updateField('safetyRating', e.target.value as SettingFormState['safetyRating'])
              }
            >
              <option value="">Unrated</option>
              <option value="G">G - General Audiences</option>
              <option value="PG">PG - Parental Guidance</option>
              <option value="PG-13">PG-13 - Parents Strongly Cautioned</option>
              <option value="R">R - Restricted</option>
              <option value="NC-17">NC-17 - Adults Only</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Excluded Topics (comma separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.excludedTopics}
              onChange={(e) => updateField('excludedTopics', e.target.value)}
              placeholder="e.g. spiders, gore, torture"
            />
            <span className="text-[10px] text-slate-500">Topics the AI should strictly avoid.</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Content Warnings (comma separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.contentWarnings}
              onChange={(e) => updateField('contentWarnings', e.target.value)}
              placeholder="e.g. violence, horror themes"
            />
          </label>
        </div>
      </div>

      {/* World Rules */}
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 font-medium text-slate-200">
          World Rules
        </div>
        <div className="p-4 grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Hard Constraints (one per line)</span>
            <textarea
              className="min-h-[150px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 font-mono text-sm"
              value={form.worldRules}
              onChange={(e) => updateField('worldRules', e.target.value)}
              placeholder="Magic requires a spoken incantation&#10;FTL travel takes 1 week minimum&#10;Gravity is 0.5x Earth standard"
            />
            <span className="text-[10px] text-slate-500">
              Physics, magic systems, and logic constraints the AI must follow.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
