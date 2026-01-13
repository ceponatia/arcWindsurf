import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { FEAR_CATEGORIES, COPING_MECHANISMS } from '@minimal-rpg/schemas';
import { type FearEntry, createFearEntry } from '../../types.js';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { SelectInput, SliderInput } from '../../../../shared/components/common.js';

export const FearsList: React.FC = () => {
  useSignals();

  const fears = characterProfile.value.personalityMap?.fears ?? [];

  const handleUpdate = (newFears: FearEntry[]) => {
    updatePersonalityMap({ fears: newFears });
  };

  return (
    <div className="space-y-4">
      {fears.map((fear, idx) => (
        <div
          key={idx}
          className="space-y-3 p-3 bg-slate-800/20 rounded-lg border border-slate-800/40 relative group"
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <SelectInput
                label="Category"
                value={fear.category}
                onChange={(v) => {
                  const newFears = fears.map((f, i) =>
                    i === idx ? { ...f, category: v as FearEntry['category'] } : f
                  );
                  handleUpdate(newFears);
                }}
                options={FEAR_CATEGORIES}
              />
            </div>
            <div className="flex-1">
              <SelectInput
                label="Coping Mechanism"
                value={fear.copingMechanism}
                onChange={(v) => {
                  const newFears = fears.map((f, i) =>
                    i === idx ? { ...f, copingMechanism: v as FearEntry['copingMechanism'] } : f
                  );
                  handleUpdate(newFears);
                }}
                options={COPING_MECHANISMS}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-slate-400">Specific Fear</span>
            <input
              className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={fear.specific}
              onChange={(e) => {
                const newFears = fears.map((f, i) =>
                  i === idx ? { ...f, specific: e.target.value } : f
                );
                handleUpdate(newFears);
              }}
              placeholder="What specifically they fear..."
            />
          </label>

          <SliderInput
            label="Intensity"
            value={fear.intensity}
            onChange={(v) => {
              const newFears = fears.map((f, i) => (i === idx ? { ...f, intensity: v } : f));
              handleUpdate(newFears);
            }}
          />

          <label className="block">
            <span className="text-xs text-slate-400">Triggers (comma-separated)</span>
            <input
              className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
              value={(fear.triggers ?? []).join(', ')}
              onChange={(e) => {
                const val = e.target.value;
                const newFears = fears.map((f, i) =>
                  i === idx
                    ? {
                      ...f,
                      triggers: val
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }
                    : f
                );
                handleUpdate(newFears as FearEntry[]);
              }}
              placeholder="e.g., darkness, crowds, loud noises"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              const newFears = fears.filter((_, i) => i !== idx);
              handleUpdate(newFears);
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-slate-400 hover:text-red-400 rounded-full border border-slate-700 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            title="Remove fear"
          >
            ✕
          </button>
        </div>
      ))}

      {fears.length < 4 && (
        <button
          type="button"
          onClick={() => handleUpdate([...fears, createFearEntry()])}
          className="w-full py-2 border border-dashed border-slate-700 rounded-lg text-xs text-slate-400 hover:text-violet-400 hover:border-violet-400 transition-all"
        >
          + Add Fear
        </button>
      )}
    </div>
  );
};
