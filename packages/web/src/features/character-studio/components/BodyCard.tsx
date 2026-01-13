import React from 'react';
import { useSignals } from '@preact/signals-react/runtime';
import { type BodyMap, type BodyRegion } from '@minimal-rpg/schemas';
import { characterProfile, updateProfile } from '../signals.js';
import { IdentityCard } from './IdentityCard.js';

/**
 * BodyCard handles high-level physical descriptions for key regions.
 * Simplified for Phase 3 to focus on description fields rather than full sensory data.
 */
export const BodyCard: React.FC<{ hasContent?: boolean }> = ({ hasContent }) => {
  useSignals();

  /** Current body map from signal */
  const body: BodyMap = characterProfile.value.body ?? {};

  /**
   * Helper to get visual description for a region.
   * Defaults to empty string if not set.
   */
  const getRegionDescription = (region: BodyRegion): string => {
    const data = body[region];
    return data?.visual?.description ?? '';
  };

  /**
   * Helper to update visual description for a region while preserving other sensory data.
   */
  const updateBodyRegion = (region: BodyRegion, description: string) => {
    const currentRegionData = body[region] ?? {};
    const updatedBody: BodyMap = {
      ...body,
      [region]: {
        ...currentRegionData,
        visual: {
          ...currentRegionData.visual,
          description,
        },
      },
    };
    updateProfile('body', updatedBody);
  };

  /**
   * Calculate completion percentage for the body card.
   * Tracks 4 key regions: hair, face, torso, hands.
   */
  const calculateCompletion = (): number => {
    const regions: BodyRegion[] = ['hair', 'face', 'torso', 'hands'] as BodyRegion[];
    const filled = regions.filter((r) => getRegionDescription(r).trim().length > 0).length;
    return (filled / regions.length) * 100;
  };

  return (
    <IdentityCard
      title="Body & Appearance"
      defaultOpen={false}
      completionPercent={calculateCompletion()}
      hasContent={hasContent}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hair</span>
          <input
            type="text"
            className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="Color, style, length..."
            value={getRegionDescription('hair' as BodyRegion)}
            onChange={(e) => updateBodyRegion('hair' as BodyRegion, e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Face</span>
          <textarea
            className="mt-1 w-full min-h-[80px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="Describe facial features, eye color, uniquely shaped nose..."
            value={getRegionDescription('face' as BodyRegion)}
            onChange={(e) => updateBodyRegion('face' as BodyRegion, e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Torso</span>
          <input
            type="text"
            className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="Build, musculature, posture, notable birthmarks..."
            value={getRegionDescription('torso' as BodyRegion)}
            onChange={(e) => updateBodyRegion('torso' as BodyRegion, e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Hands</span>
          <input
            type="text"
            className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500 text-sm"
            placeholder="Description, calluses, scars, ring marks..."
            value={getRegionDescription('hands' as BodyRegion)}
            onChange={(e) => updateBodyRegion('hands' as BodyRegion, e.target.value)}
          />
        </label>
      </div>
    </IdentityCard>
  );
};
