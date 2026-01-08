import React from 'react';
import { CORE_VALUES, type ValueEntry, createValueEntry } from '@minimal-rpg/schemas';
import type { PersonalityFormState } from '@minimal-rpg/schemas';
import { Subsection, SelectInput } from '../../../../shared/components/common.js';

interface ValuesListProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const ValuesList: React.FC<ValuesListProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Core Values">
      {pm.values.map((val, idx) => (
        <div key={idx} className="flex gap-2 items-end">
          <SelectInput
            label="Value"
            value={val.value}
            onChange={(v) => {
              const newValues = pm.values.map((item, i) =>
                i === idx ? { ...item, value: v as ValueEntry['value'] } : item
              );
              updatePM('values', newValues);
            }}
            options={CORE_VALUES}
          />
          <label className="flex flex-col gap-1 w-20">
            <span className="text-xs text-slate-400">Priority</span>
            <input
              type="number"
              min="1"
              max="10"
              value={val.priority}
              onChange={(e) => {
                const newValues = pm.values.map((item, i) =>
                  i === idx ? { ...item, priority: parseInt(e.target.value) || 5 } : item
                );
                updatePM('values', newValues);
              }}
              className="bg-slate-900 text-slate-200 rounded-md px-2 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const newValues = pm.values.filter((_, i) => i !== idx);
              updatePM('values', newValues);
            }}
            className="px-2 py-2 text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      ))}
      {pm.values.length < 5 && (
        <button
          type="button"
          onClick={() => updatePM('values', [...pm.values, createValueEntry()])}
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          + Add Value
        </button>
      )}
    </Subsection>
  );
};
