import React from 'react';
import { STRESS_RESPONSES, RECOVERY_RATES } from '@minimal-rpg/schemas';
import { HelpIcon } from '@minimal-rpg/ui';
import type { PersonalityFormState } from '../../types.js';
import { Subsection, SelectInput, SliderInput } from './common.js';

interface StressBehaviorFormProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const StressBehaviorForm: React.FC<StressBehaviorFormProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Stress Behavior">
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          label="Primary Response"
          value={pm.stress.primary}
          onChange={(v) =>
            updatePM('stress', {
              ...pm.stress,
              primary: v as (typeof STRESS_RESPONSES)[number],
            })
          }
          options={STRESS_RESPONSES}
        />
        <SelectInput
          label="Secondary Response"
          value={pm.stress.secondary ?? ''}
          onChange={(v) => {
            const newSecondary = v ? (v as (typeof STRESS_RESPONSES)[number]) : undefined;
            const baseStress = {
              primary: pm.stress.primary,
              threshold: pm.stress.threshold,
              recoveryRate: pm.stress.recoveryRate,
              soothingActivities: pm.stress.soothingActivities,
              stressIndicators: pm.stress.stressIndicators,
            };
            updatePM(
              'stress',
              newSecondary ? { ...baseStress, secondary: newSecondary } : baseStress
            );
          }}
          options={['', ...STRESS_RESPONSES]}
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-slate-400">Stress Threshold</span>
        <HelpIcon tooltip="How much pressure the character can handle before breaking down or reacting negatively. High threshold means they are resilient." />
      </div>
      <SliderInput
        label=""
        value={pm.stress.threshold}
        onChange={(v) => updatePM('stress', { ...pm.stress, threshold: v })}
        lowLabel="Low"
        highLabel="High"
      />
      <SelectInput
        label="Recovery Rate"
        value={pm.stress.recoveryRate}
        onChange={(v) =>
          updatePM('stress', {
            ...pm.stress,
            recoveryRate: v as (typeof RECOVERY_RATES)[number],
          })
        }
        options={RECOVERY_RATES}
      />
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Soothing Activities (comma-separated)</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={pm.stress.soothingActivities}
          onChange={(e) => updatePM('stress', { ...pm.stress, soothingActivities: e.target.value })}
          placeholder="e.g., reading, walking, music"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Stress Indicators (comma-separated)</span>
        <input
          className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
          value={pm.stress.stressIndicators}
          onChange={(e) => updatePM('stress', { ...pm.stress, stressIndicators: e.target.value })}
          placeholder="e.g., pacing, nail-biting, silence"
        />
      </label>
    </Subsection>
  );
};
