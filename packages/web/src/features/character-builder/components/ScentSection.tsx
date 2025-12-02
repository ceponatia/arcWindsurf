import React from 'react';
import type { FormState, UpdateFieldFn } from '../types.js';

interface ScentSectionProps {
  form: FormState;
  updateField: UpdateFieldFn;
}

export const ScentSection: React.FC<ScentSectionProps> = ({ form, updateField }) => (
  <div className="border border-slate-800 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Scent (optional)</div>
    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Hair Scent</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.scentHair}
          onChange={(e) => updateField('scentHair', e.target.value)}
        >
          <option value=""></option>
          <option value="floral">floral</option>
          <option value="citrus">citrus</option>
          <option value="fresh">fresh</option>
          <option value="herbal">herbal</option>
          <option value="neutral">neutral</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Body Scent</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.scentBody}
          onChange={(e) => updateField('scentBody', e.target.value)}
        >
          <option value=""></option>
          <option value="clean">clean</option>
          <option value="fresh">fresh</option>
          <option value="neutral">neutral</option>
          <option value="light musk">light musk</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Perfume (max 40 chars)</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.scentPerfume}
          maxLength={40}
          onChange={(e) => updateField('scentPerfume', e.target.value)}
        />
      </label>
    </div>
  </div>
);
