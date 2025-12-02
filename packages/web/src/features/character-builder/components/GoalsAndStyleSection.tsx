import React from 'react';
import {
  SPEECH_DARKNESS_LEVELS,
  SPEECH_FORMALITY_LEVELS,
  SPEECH_HUMOR_LEVELS,
  SPEECH_PACING_LEVELS,
  SPEECH_SENTENCE_LENGTHS,
  SPEECH_VERBOSITY_LEVELS,
} from '@minimal-rpg/schemas';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import type { FormFieldErrors, FormState, UpdateFieldFn } from '../types.js';

interface GoalsAndStyleSectionProps {
  form: FormState;
  fieldErrors: FormFieldErrors;
  updateField: UpdateFieldFn;
}

export const GoalsAndStyleSection: React.FC<GoalsAndStyleSectionProps> = ({
  form,
  fieldErrors,
  updateField,
}) => (
  <div className="border border-slate-800 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Goals &amp; Style</div>
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Speaking Style</span>
        <textarea
          className="min-h-[100px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.speakingStyle}
          onChange={(e) => updateField('speakingStyle', e.target.value)}
          {...getInlineErrorProps('speakingStyle', fieldErrors.speakingStyle)}
        />
        {fieldErrors.speakingStyle && (
          <span id="speakingStyle-error" className="text-sm text-red-400">
            {fieldErrors.speakingStyle}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Sentence Length</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.styleSentenceLength}
          onChange={(e) => updateField('styleSentenceLength', e.target.value)}
        >
          <option value=""></option>
          {SPEECH_SENTENCE_LENGTHS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Humor</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.styleHumor}
          onChange={(e) => updateField('styleHumor', e.target.value)}
        >
          <option value=""></option>
          {SPEECH_HUMOR_LEVELS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Darkness</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.styleDarkness}
          onChange={(e) => updateField('styleDarkness', e.target.value)}
        >
          <option value=""></option>
          {SPEECH_DARKNESS_LEVELS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Pacing</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.stylePacing}
          onChange={(e) => updateField('stylePacing', e.target.value)}
        >
          <option value=""></option>
          {SPEECH_PACING_LEVELS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Formality</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.styleFormality}
          onChange={(e) => updateField('styleFormality', e.target.value)}
        >
          <option value=""></option>
          {SPEECH_FORMALITY_LEVELS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Verbosity</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.styleVerbosity}
          onChange={(e) => updateField('styleVerbosity', e.target.value)}
        >
          <option value=""></option>
          {SPEECH_VERBOSITY_LEVELS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    </div>
  </div>
);
