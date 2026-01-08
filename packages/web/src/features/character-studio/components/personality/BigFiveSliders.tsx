import React from 'react';
import { PERSONALITY_DIMENSIONS } from '@minimal-rpg/schemas';
import type { PersonalityFormState } from '../../types.js';
import { RadarChart } from '../RadarChart.js';
import { Subsection, SliderInput } from './common.js';

interface BigFiveSlidersProps {
  pm: PersonalityFormState;
  updatePM: <K extends keyof PersonalityFormState>(key: K, value: PersonalityFormState[K]) => void;
}

export const BigFiveSliders: React.FC<BigFiveSlidersProps> = ({ pm, updatePM }) => {
  return (
    <Subsection title="Big Five Dimensions" defaultOpen={true}>
      <div className="flex justify-center -my-4">
        <RadarChart
          data={PERSONALITY_DIMENSIONS.map((dim) => ({
            label: dim.charAt(0).toUpperCase() + dim.slice(1),
            value: pm.dimensions.find((d) => d.dimension === dim)?.score ?? 0.5,
          }))}
          size={240}
        />
      </div>
      {PERSONALITY_DIMENSIONS.map((dim) => {
        const entry = pm.dimensions.find((d) => d.dimension === dim);
        const score = entry?.score ?? 0.5;
        return (
          <SliderInput
            key={dim}
            label={dim.charAt(0).toUpperCase() + dim.slice(1)}
            value={score}
            onChange={(newScore) => {
              const newDimensions = pm.dimensions.map((d) =>
                d.dimension === dim ? { ...d, score: newScore } : d
              );
              updatePM('dimensions', newDimensions);
            }}
          />
        );
      })}
    </Subsection>
  );
};
