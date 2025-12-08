import React from 'react';
import { getInlineErrorProps } from '@minimal-rpg/utils';
import type { FormFieldErrors, FormState, UpdateFieldFn } from '../types.js';

interface BasicsSectionProps {
  form: FormState;
  fieldErrors: FormFieldErrors;
  updateField: UpdateFieldFn;
}

export const BasicsSection: React.FC<BasicsSectionProps> = ({ form, fieldErrors, updateField }) => (
  <div className="border border-slate-800 rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">Basics</div>
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">ID</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.id}
          onChange={(e) => updateField('id', e.target.value)}
          {...getInlineErrorProps('id', fieldErrors.id)}
        />
        {fieldErrors.id && (
          <span id="id-error" className="text-sm text-red-400">
            {fieldErrors.id}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Name</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          {...getInlineErrorProps('name', fieldErrors.name)}
        />
        {fieldErrors.name && (
          <span id="name-error" className="text-sm text-red-400">
            {fieldErrors.name}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Age</span>
        <input
          type="number"
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.age}
          onChange={(e) => updateField('age', e.target.value)}
          {...getInlineErrorProps('age', fieldErrors.age)}
        />
        {fieldErrors.age && (
          <span id="age-error" className="text-sm text-red-400">
            {fieldErrors.age}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Gender</span>
        <select
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.gender}
          onChange={(e) => updateField('gender', e.target.value)}
          {...getInlineErrorProps('gender', fieldErrors.gender)}
        >
          <option value="">Select gender...</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="unknown">Unknown</option>
        </select>
        {fieldErrors.gender && (
          <span id="gender-error" className="text-sm text-red-400">
            {fieldErrors.gender}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Tags (comma)</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.tags}
          onChange={(e) => updateField('tags', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-xs text-slate-400">Summary</span>
        <textarea
          className="min-h-[100px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          {...getInlineErrorProps('summary', fieldErrors.summary)}
        />
        {fieldErrors.summary && (
          <span id="summary-error" className="text-sm text-red-400">
            {fieldErrors.summary}
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-xs text-slate-400">Backstory</span>
        <textarea
          className="min-h-[100px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={form.backstory}
          onChange={(e) => updateField('backstory', e.target.value)}
          {...getInlineErrorProps('backstory', fieldErrors.backstory)}
        />
        {fieldErrors.backstory && (
          <span id="backstory-error" className="text-sm text-red-400">
            {fieldErrors.backstory}
          </span>
        )}
      </label>
    </div>
  </div>
);
