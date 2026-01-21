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
  const dimensions = PERSONALITY_DIMENSIONS.reduce(
    (acc, dimension) => {
      acc[dimension] =
        getRecordOptional(characterProfile.value.personalityMap?.dimensions, dimension) ?? 0.5;
      return acc;
    },
    {} as Record<PersonalityDimension, number>
  );

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
            value: dimensions[dim],
          }))}
          size={240}
        />
      </div>
      {PERSONALITY_DIMENSIONS.map((dim) => {
        const score = dimensions[dim];
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
