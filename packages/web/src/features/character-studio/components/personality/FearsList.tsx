import React from 'react';
import { FEAR_CATEGORIES, COPING_MECHANISMS } from '@minimal-rpg/schemas';
import type { PersonalityFormState, FearEntry } from '../../types.js';
import { createFearEntry } from '../../types.js';
import { Subsection, SelectInput, SliderInput } from './common.js';

interface FearsListProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const FearsList: React.FC<FearsListProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Fears">
      {pm.fears.map((fear, idx) => (
        <div key={idx} className="space-y-2 border-b border-slate-700 pb-2 mb-2">
          <div className="flex gap-2 items-end">
            <SelectInput
              label="Category"
              value={fear.category}
              onChange={(v) => {
                const newFears = pm.fears.map((f, i) =>
                  i === idx ? { ...f, category: v as FearEntry['category'] } : f
                );
                updatePM('fears', newFears);
              }}
              options={FEAR_CATEGORIES}
            />
            <SelectInput
              label="Coping"
              value={fear.copingMechanism}
              onChange={(v) => {
                const newFears = pm.fears.map((f, i) =>
                  i === idx ? { ...f, copingMechanism: v as FearEntry['copingMechanism'] } : f
                );
                updatePM('fears', newFears);
              }}
              options={COPING_MECHANISMS}
            />
            <button
              type="button"
              onClick={() => {
                const newFears = pm.fears.filter((_, i) => i !== idx);
                updatePM('fears', newFears);
              }}
              className="px-2 py-2 text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Specific</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={fear.specific}
              onChange={(e) => {
                const newFears = pm.fears.map((f, i) =>
                  i === idx ? { ...f, specific: e.target.value } : f
                );
                updatePM('fears', newFears);
              }}
              placeholder="What specifically they fear..."
            />
          </label>
          <SliderInput
            label="Intensity"
            value={fear.intensity}
            onChange={(v) => {
              const newFears = pm.fears.map((f, i) => (i === idx ? { ...f, intensity: v } : f));
              updatePM('fears', newFears);
            }}
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Triggers (comma-separated)</span>
            <input
              className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={fear.triggers}
              onChange={(e) => {
                const newFears = pm.fears.map((f, i) =>
                  i === idx ? { ...f, triggers: e.target.value } : f
                );
                updatePM('fears', newFears);
              }}
              placeholder="e.g., darkness, crowds, loud noises"
            />
          </label>
        </div>
      ))}
      {pm.fears.length < 4 && (
        <button
          type="button"
          onClick={() => updatePM('fears', [...pm.fears, createFearEntry()])}
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          + Add Fear
        </button>
      )}
    </Subsection>
  );
};
