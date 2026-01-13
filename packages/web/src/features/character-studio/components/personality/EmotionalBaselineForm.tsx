import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { CORE_EMOTIONS, EMOTION_INTENSITIES } from '@minimal-rpg/schemas';
import { HelpIcon } from '@minimal-rpg/ui';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { SelectInput, SliderInput } from '../../../../shared/components/common.js';

export const EmotionalBaselineForm: React.FC = () => {
  useSignals();

  const baseline = characterProfile.value.personalityMap?.emotionalBaseline ?? {
    current: CORE_EMOTIONS[7], // anticipation
    intensity: EMOTION_INTENSITIES[0], // mild
    moodBaseline: CORE_EMOTIONS[1], // trust
    moodStability: 0.5,
  };

  const handleChange = (updates: Partial<typeof baseline>) => {
    updatePersonalityMap({
      emotionalBaseline: {
        ...baseline,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          label="Current Emotion"
          value={baseline.current}
          onChange={(v) => handleChange({ current: v as (typeof CORE_EMOTIONS)[number] })}
          options={CORE_EMOTIONS}
        />
        <SelectInput
          label="Intensity"
          value={baseline.intensity}
          onChange={(v) => handleChange({ intensity: v as (typeof EMOTION_INTENSITIES)[number] })}
          options={EMOTION_INTENSITIES}
        />
        <SelectInput
          label="Mood Baseline"
          value={baseline.moodBaseline}
          onChange={(v) => handleChange({ moodBaseline: v as (typeof CORE_EMOTIONS)[number] })}
          options={CORE_EMOTIONS}
        />
        <SelectInput
          label="Blend (optional)"
          value={baseline.blend ?? ''}
          onChange={(v) => {
            const newBlend = v ? (v as (typeof CORE_EMOTIONS)[number]) : undefined;
            handleChange({ blend: newBlend });
          }}
          options={['', ...CORE_EMOTIONS]}
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-slate-400">Mood Stability</span>
        <HelpIcon tooltip="How quickly the character's mood changes in response to events. High stability means they are hard to shake; low stability means they are volatile." />
      </div>
      <SliderInput
        label=""
        value={baseline.moodStability}
        onChange={(v) => handleChange({ moodStability: v })}
        lowLabel="Volatile"
        highLabel="Stable"
      />
    </div>
  );
};
