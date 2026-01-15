import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { STRESS_RESPONSES, RECOVERY_RATES } from '@minimal-rpg/schemas';
import { HelpIcon } from '@minimal-rpg/ui';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { SelectInput, SliderInput } from '../../../../shared/components/common.js';

export const StressBehaviorForm: React.FC = () => {
  useSignals();

  const stressRaw = characterProfile.value.personalityMap?.stress;
  interface StressFormState {
    primary: (typeof STRESS_RESPONSES)[number];
    secondary?: (typeof STRESS_RESPONSES)[number] | undefined;
    threshold: number;
    recoveryRate: (typeof RECOVERY_RATES)[number];
    soothingActivities: string[];
    stressIndicators: string[];
  }

  const stress: StressFormState = {
    primary: stressRaw?.primary ?? STRESS_RESPONSES[2], // freeze
    secondary: stressRaw?.secondary,
    threshold: typeof stressRaw?.threshold === 'number' ? stressRaw.threshold : 0.5,
    recoveryRate: stressRaw?.recoveryRate ?? RECOVERY_RATES[1], // moderate
    soothingActivities: Array.isArray(stressRaw?.soothingActivities)
      ? stressRaw.soothingActivities
      : [],
    stressIndicators: Array.isArray(stressRaw?.stressIndicators) ? stressRaw.stressIndicators : [],
  };

  const handleChange = (updates: Partial<StressFormState>) => {
    updatePersonalityMap({
      stress: {
        ...stress,
        ...updates,
      },
    });
  };

  const handleListUpdate = (
    field: 'soothingActivities' | 'stressIndicators',
    index: number,
    value: string
  ) => {
    const newList = [...stress[field]];
    newList[index] = value;
    handleChange({ [field]: newList });
  };

  const addListItem = (field: 'soothingActivities' | 'stressIndicators', value = '') => {
    const newList = [...stress[field], value];
    handleChange({ [field]: newList });
  };

  const removeListItem = (field: 'soothingActivities' | 'stressIndicators', index: number) => {
    const newList = stress[field].filter((_, i) => i !== index);
    handleChange({ [field]: newList });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          label="Primary Response"
          value={stress.primary}
          onChange={(v) => handleChange({ primary: v as (typeof STRESS_RESPONSES)[number] })}
          options={STRESS_RESPONSES}
        />
        <SelectInput
          label="Secondary Response"
          value={stress.secondary ?? ''}
          onChange={(v) =>
            handleChange({ secondary: (v as (typeof STRESS_RESPONSES)[number]) || undefined })
          }
          options={['', ...STRESS_RESPONSES]}
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400">Stress Threshold</span>
          <HelpIcon tooltip="How much pressure the character can handle before breaking down or reacting negatively. High threshold means they are resilient." />
        </div>
        <SliderInput
          label=""
          value={stress.threshold}
          onChange={(v) => handleChange({ threshold: v })}
          lowLabel="Low"
          highLabel="High"
        />
      </div>

      <div className="mb-4">
        <SelectInput
          label="Recovery Rate"
          value={stress.recoveryRate}
          onChange={(v) => handleChange({ recoveryRate: v as (typeof RECOVERY_RATES)[number] })}
          options={RECOVERY_RATES}
        />
      </div>

      <div className="space-y-4">
        {/* Stress Indicators (Tells) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Stress Indicators (Tells)</span>
            {stress.stressIndicators.length < 5 && (
              <button
                type="button"
                onClick={() => addListItem('stressIndicators')}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-medium"
              >
                + Add Tell
              </button>
            )}
          </div>
          <div className="space-y-2">
            {stress.stressIndicators.map((tell, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className="flex-1 bg-slate-900 text-slate-200 rounded-md px-3 py-1.5 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={tell}
                  onChange={(e) => handleListUpdate('stressIndicators', idx, e.target.value)}
                  placeholder="e.g., Pacing, nail-biting..."
                />
                <button
                  type="button"
                  onClick={() => removeListItem('stressIndicators', idx)}
                  className="text-slate-500 hover:text-red-400 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Soothing Activities (Coping) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Soothing Activities (Coping)</span>
            {stress.soothingActivities.length < 5 && (
              <button
                type="button"
                onClick={() => addListItem('soothingActivities')}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-medium"
              >
                + Add Activity
              </button>
            )}
          </div>
          <div className="space-y-2">
            {stress.soothingActivities.map((activity, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className="flex-1 bg-slate-900 text-slate-200 rounded-md px-3 py-1.5 text-sm outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={activity}
                  onChange={(e) => handleListUpdate('soothingActivities', idx, e.target.value)}
                  placeholder="e.g., Reading, meditation..."
                />
                <button
                  type="button"
                  onClick={() => removeListItem('soothingActivities', idx)}
                  className="text-slate-500 hover:text-red-400 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
