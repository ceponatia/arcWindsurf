import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { PERSONALITY_DIMENSIONS, getRecordOptional, setRecord } from '@minimal-rpg/schemas';
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
      const score =
        getRecordOptional(characterProfile.value.personalityMap?.dimensions, dimension) ?? 0.5;
      setRecord(acc, dimension, score);
      return acc;
    },
    {} as Record<PersonalityDimension, number>
  );

  const handleSliderChange = (dimension: PersonalityDimension, value: number) => {
    const nextDimensions = {
      ...(characterProfile.value.personalityMap?.dimensions ?? {}),
    } as Record<PersonalityDimension, number>;
    setRecord(nextDimensions, dimension, value);
    updatePersonalityMap({
      dimensions: nextDimensions,
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
