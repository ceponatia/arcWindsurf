import React from 'react';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import type { SettingFormState, SettingFormFieldErrors, SettingFormKey } from '../types.js';

interface SettingGeneralFormProps {
  form: SettingFormState;
  fieldErrors: SettingFormFieldErrors;
  updateField: <K extends SettingFormKey>(key: K, value: SettingFormState[K]) => void;
}

export const SettingGeneralForm: React.FC<SettingGeneralFormProps> = ({
  form,
  fieldErrors,
  updateField,
}) => {
  return (
    <div className="space-y-4">
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 font-medium text-slate-200">
          General Information
        </div>
        <div className="p-4 grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Name</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              {...getInlineErrorProps('name', fieldErrors.name)}
            />
            {fieldErrors.name && <span className="text-sm text-red-400">{fieldErrors.name}</span>}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Themes (comma separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.themes}
              onChange={(e) => updateField('themes', e.target.value)}
              placeholder="e.g. Dark Fantasy, Cyberpunk, Noir"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Tags (comma separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="tags for filtering"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Tone Instruction</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.tone}
              onChange={(e) => updateField('tone', e.target.value)}
              placeholder="e.g. Grimdark, Whimsical, Hard Sci-Fi"
            />
            <span className="text-[10px] text-slate-500">
              Instructs the AI on the narrative style.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Starting Scenario</span>
            <textarea
              className="min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={form.startingScenario}
              onChange={(e) => updateField('startingScenario', e.target.value)}
              placeholder="A default hook or opening scene..."
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Lore</span>
            <textarea
              className="min-h-[200px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 font-mono text-sm"
              value={form.lore}
              onChange={(e) => updateField('lore', e.target.value)}
              {...getInlineErrorProps('lore', fieldErrors.lore)}
              placeholder="Markdown supported..."
            />
            {fieldErrors.lore && <span className="text-sm text-red-400">{fieldErrors.lore}</span>}
          </label>
        </div>
      </div>
    </div>
  );
};
