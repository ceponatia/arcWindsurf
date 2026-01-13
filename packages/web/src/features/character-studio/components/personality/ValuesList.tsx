import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { CORE_VALUES, type ValueEntry, createValueEntry } from '@minimal-rpg/schemas';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { SelectInput } from '../../../../shared/components/common.js';

export const ValuesList: React.FC = () => {
  useSignals();

  const values = characterProfile.value.personalityMap?.values ?? [];

  const handleUpdate = (newValues: ValueEntry[]) => {
    updatePersonalityMap({ values: newValues });
  };

  return (
    <div className="space-y-3">
      {values.map((val, idx) => (
        <div key={idx} className="flex gap-2 items-end">
          <div className="flex-1">
            <SelectInput
              label="Value"
              value={val.value}
              onChange={(v) => {
                const newValues = values.map((item, i) =>
                  i === idx ? { ...item, value: v as ValueEntry['value'] } : item
                );
                handleUpdate(newValues);
              }}
              options={CORE_VALUES}
            />
          </div>
          <label className="flex flex-col gap-1 w-20">
            <span className="text-xs text-slate-400">Priority</span>
            <input
              type="number"
              min="1"
              max="10"
              value={val.priority}
              onChange={(e) => {
                const newValues = values.map((item, i) =>
                  i === idx ? { ...item, priority: parseInt(e.target.value) || 5 } : item
                );
                handleUpdate(newValues);
              }}
              className="bg-slate-900 text-slate-200 rounded-md px-2 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const newValues = values.filter((_, i) => i !== idx);
              handleUpdate(newValues);
            }}
            className="px-2 py-2 text-red-400 hover:text-red-300 transition-colors"
            title="Remove value"
          >
            ✕
          </button>
        </div>
      ))}
      {values.length < 5 && (
        <button
          type="button"
          onClick={() => handleUpdate([...values, createValueEntry()])}
          className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          + Add Value
        </button>
      )}
    </div>
  );
};
