import React, { useMemo } from 'react';
import type { TurnMetadata } from '../../types.js';
import { buildTurnDebugSlices } from './buildTurnDebugSlices.js';
import { TurnDebugBubble } from './TurnDebugBubble.js';

export interface TurnDebugPanelProps {
  metadata: TurnMetadata;
}

export const TurnDebugPanel: React.FC<TurnDebugPanelProps> = ({ metadata }) => {
  const slices = useMemo(() => buildTurnDebugSlices(metadata), [metadata]);

  if (!slices.length) {
    return null;
  }

  return (
    <div className="space-y-2 mt-1">
      {slices.map((slice) => (
        <TurnDebugBubble key={slice.id} slice={slice} />
      ))}
    </div>
  );
};
