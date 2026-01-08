import React from 'react';
import {
  VOCABULARY_LEVELS,
  SENTENCE_STRUCTURES,
  FORMALITY_LEVELS,
  HUMOR_FREQUENCIES,
  HUMOR_TYPES,
  EXPRESSIVENESS_LEVELS,
  DIRECTNESS_LEVELS,
  PACE_LEVELS,
} from '@minimal-rpg/schemas';
import type { PersonalityFormState } from '@minimal-rpg/schemas';
import { Subsection, SelectInput } from '../../../../shared/components/common.js';

interface SpeechStyleFormProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const SpeechStyleForm: React.FC<SpeechStyleFormProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Speech Style">
      <div className="grid grid-cols-2 gap-3">
        <SelectInput
          label="Vocabulary"
          value={pm.speech.vocabulary}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              vocabulary: v as (typeof VOCABULARY_LEVELS)[number],
            })
          }
          options={VOCABULARY_LEVELS}
        />
        <SelectInput
          label="Sentence Structure"
          value={pm.speech.sentenceStructure}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              sentenceStructure: v as (typeof SENTENCE_STRUCTURES)[number],
            })
          }
          options={SENTENCE_STRUCTURES}
        />
        <SelectInput
          label="Formality"
          value={pm.speech.formality}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              formality: v as (typeof FORMALITY_LEVELS)[number],
            })
          }
          options={FORMALITY_LEVELS}
        />
        <SelectInput
          label="Humor Frequency"
          value={pm.speech.humor}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              humor: v as (typeof HUMOR_FREQUENCIES)[number],
            })
          }
          options={HUMOR_FREQUENCIES}
        />
        {pm.speech.humor !== 'none' && (
          <SelectInput
            label="Humor Type"
            value={pm.speech.humorType ?? ''}
            onChange={(v) => {
              const newHumorType = v ? (v as (typeof HUMOR_TYPES)[number]) : undefined;
              const baseSpeech = {
                vocabulary: pm.speech.vocabulary,
                sentenceStructure: pm.speech.sentenceStructure,
                formality: pm.speech.formality,
                humor: pm.speech.humor,
                expressiveness: pm.speech.expressiveness,
                directness: pm.speech.directness,
                pace: pm.speech.pace,
              };
              updatePM(
                'speech',
                newHumorType ? { ...baseSpeech, humorType: newHumorType } : baseSpeech
              );
            }}
            options={['', ...HUMOR_TYPES]}
          />
        )}
        <SelectInput
          label="Expressiveness"
          value={pm.speech.expressiveness}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              expressiveness: v as (typeof EXPRESSIVENESS_LEVELS)[number],
            })
          }
          options={EXPRESSIVENESS_LEVELS}
        />
        <SelectInput
          label="Directness"
          value={pm.speech.directness}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              directness: v as (typeof DIRECTNESS_LEVELS)[number],
            })
          }
          options={DIRECTNESS_LEVELS}
        />
        <SelectInput
          label="Pace"
          value={pm.speech.pace}
          onChange={(v) =>
            updatePM('speech', {
              ...pm.speech,
              pace: v as (typeof PACE_LEVELS)[number],
            })
          }
          options={PACE_LEVELS}
        />
      </div>
    </Subsection>
  );
};
