import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { PERSONALITY_DIMENSIONS, getRecordOptional } from '@minimal-rpg/schemas';
import { characterProfile, updatePersonalityMap } from '../../signals.js';
import { RadarChart } from '../RadarChart.js';
import { SliderInput } from '../../../../shared/components/common.js';

/**
 * Big Five personality dimension sliders hooked to studio signals.
 */
export const BigFiveSliders: React.FC = () => {
  useSignals();

  type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];
  const defaultDimensions: Record<PersonalityDimension, number> = {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  };
  const dimensions: Record<PersonalityDimension, number> = {
    ...defaultDimensions,
    ...(characterProfile.value.personalityMap?.dimensions ?? {}),
  };

  const handleSliderChange = (dimension: PersonalityDimension, value: number) => {
    updatePersonalityMap({
      dimensions: {
        ...characterProfile.value.personalityMap?.dimensions,
        [dimension]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center -my-4">
        <RadarChart
          data={PERSONALITY_DIMENSIONS.map((dim) => ({
            label: dim.charAt(0).toUpperCase() + dim.slice(1),
            value: getRecordOptional(dimensions, dim) ?? 0.5,
          }))}
          size={240}
        />
      </div>
      {PERSONALITY_DIMENSIONS.map((dim) => {
        const score = getRecordOptional(dimensions, dim) ?? 0.5;
        return (
          <SliderInput
            key={dim}
            label={dim.charAt(0).toUpperCase() + dim.slice(1)}
            value={score}
            onChange={(newScore) => handleSliderChange(dim, newScore)}
          />
        );
      })}
    </div>
  );
};
