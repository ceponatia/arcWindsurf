import React from 'react';
import { CORE_EMOTIONS, EMOTION_INTENSITIES } from '@minimal-rpg/schemas';
import { HelpIcon } from '@minimal-rpg/ui';
import type { PersonalityFormState } from '../../types.js';
import { Subsection, SelectInput, SliderInput } from './common.js';

interface EmotionalBaselineFormProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const EmotionalBaselineForm: React.FC<EmotionalBaselineFormProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Emotional Baseline">
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          label="Current Emotion"
          value={pm.emotionalBaseline.current}
          onChange={(v) =>
            updatePM('emotionalBaseline', {
              ...pm.emotionalBaseline,
              current: v as (typeof CORE_EMOTIONS)[number],
            })
          }
          options={CORE_EMOTIONS}
        />
        <SelectInput
          label="Intensity"
          value={pm.emotionalBaseline.intensity}
          onChange={(v) =>
            updatePM('emotionalBaseline', {
              ...pm.emotionalBaseline,
              intensity: v as (typeof EMOTION_INTENSITIES)[number],
            })
          }
          options={EMOTION_INTENSITIES}
        />
        <SelectInput
          label="Mood Baseline"
          value={pm.emotionalBaseline.moodBaseline}
          onChange={(v) =>
            updatePM('emotionalBaseline', {
              ...pm.emotionalBaseline,
              moodBaseline: v as (typeof CORE_EMOTIONS)[number],
            })
          }
          options={CORE_EMOTIONS}
        />
        <SelectInput
          label="Blend (optional)"
          value={pm.emotionalBaseline.blend ?? ''}
          onChange={(v) => {
            const newBlend = v ? (v as (typeof CORE_EMOTIONS)[number]) : undefined;
            const baseEntry = {
              current: pm.emotionalBaseline.current,
              intensity: pm.emotionalBaseline.intensity,
              moodBaseline: pm.emotionalBaseline.moodBaseline,
              moodStability: pm.emotionalBaseline.moodStability,
            };
            updatePM('emotionalBaseline', newBlend ? { ...baseEntry, blend: newBlend } : baseEntry);
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
        value={pm.emotionalBaseline.moodStability}
        onChange={(v) =>
          updatePM('emotionalBaseline', { ...pm.emotionalBaseline, moodStability: v })
        }
        lowLabel="Volatile"
        highLabel="Stable"
      />
    </Subsection>
  );
};
