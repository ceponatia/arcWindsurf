import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
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
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { SelectInput } from '../../../../shared/components/common.js';

export const SpeechStyleForm: React.FC = () => {
  useSignals();

  const speech = characterProfile.value.personalityMap?.speech ?? {
    vocabulary: VOCABULARY_LEVELS[1],
    sentenceStructure: SENTENCE_STRUCTURES[2],
    formality: FORMALITY_LEVELS[1],
    humor: HUMOR_FREQUENCIES[2],
    expressiveness: EXPRESSIVENESS_LEVELS[2],
    directness: DIRECTNESS_LEVELS[1],
    pace: PACE_LEVELS[2],
  };

  const handleChange = (field: string, value: unknown) => {
    updatePersonalityMap({
      speech: {
        ...speech,
        [field]: value,
      },
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectInput
        label="Vocabulary"
        value={speech.vocabulary}
        onChange={(v) => handleChange('vocabulary', v)}
        options={VOCABULARY_LEVELS}
      />
      <SelectInput
        label="Sentence Structure"
        value={speech.sentenceStructure}
        onChange={(v) => handleChange('sentenceStructure', v)}
        options={SENTENCE_STRUCTURES}
      />
      <SelectInput
        label="Formality"
        value={speech.formality}
        onChange={(v) => handleChange('formality', v)}
        options={FORMALITY_LEVELS}
      />
      <SelectInput
        label="Humor Frequency"
        value={speech.humor}
        onChange={(v) => handleChange('humor', v)}
        options={HUMOR_FREQUENCIES}
      />
      {speech.humor !== 'none' && (
        <SelectInput
          label="Humor Type"
          value={speech.humorType ?? ''}
          onChange={(v) => handleChange('humorType', v || undefined)}
          options={['', ...HUMOR_TYPES]}
        />
      )}
      <SelectInput
        label="Expressiveness"
        value={speech.expressiveness}
        onChange={(v) => handleChange('expressiveness', v)}
        options={EXPRESSIVENESS_LEVELS}
      />
      <SelectInput
        label="Directness"
        value={speech.directness}
        onChange={(v) => handleChange('directness', v)}
        options={DIRECTNESS_LEVELS}
      />
      <SelectInput
        label="Pace"
        value={speech.pace}
        onChange={(v) => handleChange('pace', v)}
        options={PACE_LEVELS}
      />
    </div>
  );
};
