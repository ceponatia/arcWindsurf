import React from 'react';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import type { FormFieldErrors, FormState, UpdateFieldFn } from '../types.js';

interface PersonalitySectionProps {
  form: FormState;
  fieldErrors: FormFieldErrors;
  updateField: UpdateFieldFn;
}

export const PersonalitySection: React.FC<PersonalitySectionProps> = ({
  form,
  fieldErrors,
  updateField,
}) => (
  <div className="border border-slate-800 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Personality</div>
    <div className="p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Traits (string or comma list)</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.personality}
          onChange={(e) => updateField('personality', e.target.value)}
          {...getInlineErrorProps('personality', fieldErrors.personality)}
        />
        {fieldErrors.personality && (
          <span id="personality-error" className="text-sm text-red-400">
            {fieldErrors.personality}
          </span>
        )}
      </label>
    </div>
  </div>
);
