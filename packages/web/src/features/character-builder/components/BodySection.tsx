import React from 'react';
import { BODY_REGIONS, type BodyRegion } from '@minimal-rpg/schemas';
import { SENSORY_TYPES, type BodySensoryEntry, type SensoryType } from '../types.js';

interface BodySectionProps {
  bodySensory: BodySensoryEntry[];
  gender?: string;
  updateBodyEntry: <K extends keyof BodySensoryEntry>(
    idx: number,
    key: K,
    value: BodySensoryEntry[K]
  ) => void;
  addBodyEntry: () => void;
  removeBodyEntry: (idx: number) => void;
}

const REGION_LABELS: Record<BodyRegion, string> = {
  head: 'Head',
  face: 'Face',
  ears: 'Ears',
  mouth: 'Mouth/Lips',
  hair: 'Hair',
  neck: 'Neck',
  throat: 'Throat',
  shoulders: 'Shoulders',
  chest: 'Chest',
  breasts: 'Breasts',
  nipples: 'Nipples',
  back: 'Back',
  lowerBack: 'Lower Back',
  torso: 'Torso/Body',
  abdomen: 'Abdomen/Belly',
  navel: 'Navel/Belly Button',
  armpits: 'Armpits',
  arms: 'Arms',
  hands: 'Hands',
  waist: 'Waist',
  hips: 'Hips',
  groin: 'Groin',
  buttocks: 'Buttocks',
  anus: 'Anus',
  penis: 'Penis',
  vagina: 'Vagina',
  legs: 'Legs (General)',
  thighs: 'Thighs',
  knees: 'Knees',
  calves: 'Calves',
  ankles: 'Ankles',
  feet: 'Feet',
  toes: 'Toes',
};

/**
 * Get available body regions based on character gender.
 * Gender-specific regions are only shown for appropriate genders.
 */
function getAvailableRegions(gender?: string): BodyRegion[] {
  const normalizedGender = gender?.toLowerCase().trim();
  const baseRegions = BODY_REGIONS.filter(
    (r) => r !== 'breasts' && r !== 'nipples' && r !== 'penis' && r !== 'vagina'
  );

  if (!normalizedGender) {
    return baseRegions;
  }

  // Female-specific regions
  if (normalizedGender.includes('female') || normalizedGender.includes('woman')) {
    return [...baseRegions, 'breasts', 'nipples', 'vagina'];
  }

  // Male-specific regions
  if (normalizedGender.includes('male') || normalizedGender.includes('man')) {
    return [...baseRegions, 'penis'];
  }

  // Non-binary or other: show all regions
  return BODY_REGIONS as unknown as BodyRegion[];
}

const SENSORY_LABELS: Record<SensoryType, string> = {
  scent: 'Scent/Smell',
  texture: 'Texture/Touch',
  visual: 'Visual/Look',
  flavor: 'Flavor/Taste',
};

const SENSORY_PLACEHOLDERS: Record<SensoryType, string> = {
  scent: 'e.g., "strong musk, lightly floral" or "lavender shampoo, intensity 0.7"',
  texture: 'e.g., "soft, warm" or "calloused, slightly rough"',
  visual: 'e.g., "long auburn waves, slight freckles"',
  flavor: 'e.g., "salty, slightly sweet" or "strong metallic, intensity 0.8"',
};

export const BodySection: React.FC<BodySectionProps> = ({
  bodySensory,
  gender,
  updateBodyEntry,
  addBodyEntry,
  removeBodyEntry,
}) => {
  const availableRegions = getAvailableRegions(gender);

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <span>Body Sensory Data</span>
          <span className="text-xs text-slate-500">Per-region scent, texture, visual, flavor</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-slate-400">
          Add sensory details for specific body regions. Use natural language like "musky, hint of
          floral" or "soft, warm". Intensity can be specified with words (strong, light, subtle) or
          numbers (0.0-1.0).
          {gender && (
            <span className="block mt-1 text-slate-500">
              Gender-specific regions are shown based on the selected gender.
            </span>
          )}
        </p>

        {bodySensory.map((entry, idx) => (
          <div
            key={`body-${idx}`}
            className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Sensory Entry #{idx + 1}</span>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-red-300"
                onClick={() => removeBodyEntry(idx)}
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Body Region</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={entry.region}
                  onChange={(e) => updateBodyEntry(idx, 'region', e.target.value as BodyRegion)}
                >
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>
                      {REGION_LABELS[region]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">Sensory Type</span>
                <select
                  className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={entry.type}
                  onChange={(e) => updateBodyEntry(idx, 'type', e.target.value as SensoryType)}
                >
                  {SENSORY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SENSORY_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-slate-400">Description</span>
                <textarea
                  className="min-h-[60px] bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                  value={entry.raw}
                  placeholder={SENSORY_PLACEHOLDERS[entry.type]}
                  onChange={(e) => updateBodyEntry(idx, 'raw', e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800"
          onClick={addBodyEntry}
        >
          + Add Sensory Entry
        </button>
      </div>
    </div>
  );
};
