import React, { useMemo } from 'react';
import { type BodyRegion, REGION_GROUPS } from '@minimal-rpg/schemas';
import { getBodyMap } from '../assets/body-maps/index.js';

interface BodyMapSelectorProps {
  selectedRegion?: string | undefined;
  onSelectRegion: (region: BodyRegion) => void;
  gender?: string | undefined;
  race?: string | undefined;
}

export const BodyMapSelector: React.FC<BodyMapSelectorProps> = ({
  selectedRegion,
  onSelectRegion,
  gender = 'neutral',
  race = 'human',
}) => {
  const isSelected = (region: string) => {
    if (selectedRegion === region) return true;
    if (selectedRegion && REGION_GROUPS[selectedRegion]?.includes(region)) {
      return true;
    }
    return false;
  };

  // Common styles for interactive body parts
  const pathClass =
    'cursor-pointer hover:fill-slate-600 transition-colors stroke-slate-900/20 stroke-1';

  const getFill = (region: string) => (isSelected(region) ? '#8b5cf6' : '#334155'); // violet-500 vs slate-700

  const bodyMap = useMemo(() => getBodyMap(race, gender), [race, gender]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-900/50 rounded-lg p-4 min-h-[400px]">
      <svg viewBox={bodyMap.viewBox} className="h-[350px] w-auto drop-shadow-lg">
        <g strokeLinecap="round" strokeLinejoin="round">
          {bodyMap.paths.map((pathData) => (
            <path
              key={pathData.region}
              d={pathData.d}
              fill={getFill(pathData.region)}
              className={pathClass}
              onClick={() => onSelectRegion(pathData.region)}
            />
          ))}
        </g>
      </svg>
      <div className="absolute bottom-2 right-2 text-xs text-slate-400">Click to select region</div>
    </div>
  );
};
