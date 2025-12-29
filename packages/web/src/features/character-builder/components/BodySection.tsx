import React from 'react';
import { BODY_REGIONS, type BodyRegion } from '@minimal-rpg/schemas';
import {
  SENSORY_TYPES,
  type BodySensoryEntry,
  type SensoryType,
  getUsedSensoryCombinations,
  findNextAvailableSensoryEntry,
  isSensoryCombinationUsed,
} from '../types.js';

interface BodySectionProps {
  bodySensory: BodySensoryEntry[];
  gender?: string;
  updateBodyEntry: <K extends keyof BodySensoryEntry>(
    idx: number,
    key: K,
    value: BodySensoryEntry[K]
  ) => void;
  addBodyEntry: (entry?: BodySensoryEntry) => void;
  removeBodyEntry: (idx: number) => void;
}

const REGION_LABELS: Partial<Record<BodyRegion, string>> = {
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

function formatRegionLabel(region: BodyRegion): string {
  const explicit = REGION_LABELS[region];
  if (explicit) return explicit;

  const spaced = region
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Get available body regions based on character gender.
 * Gender-specific regions are only shown for appropriate genders.
 */
function getAvailableRegions(gender?: string): BodyRegion[] {
  const normalizedGender = gender?.toLowerCase().trim();
  const baseRegions = BODY_REGIONS.filter(
    (r) =>
      r !== 'breasts' &&
      r !== 'leftBreast' &&
      r !== 'rightBreast' &&
      r !== 'nipples' &&
      r !== 'leftNipple' &&
      r !== 'rightNipple' &&
      r !== 'penis' &&
      r !== 'vagina'
  );

  if (!normalizedGender) {
    return baseRegions;
  }

  // Female-specific regions
  if (normalizedGender.includes('female') || normalizedGender.includes('woman')) {
    return [
      ...baseRegions,
      'breasts',
      'leftBreast',
      'rightBreast',
      'nipples',
      'leftNipple',
      'rightNipple',
      'vagina',
    ];
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
  flavor: 'Flavor/Taste',
};

const SENSORY_PLACEHOLDERS: Record<SensoryType, string> = {
  scent: 'e.g., "strong musk, lightly floral" or "lavender shampoo, intensity 0.7"',
  texture: 'e.g., "soft, warm" or "calloused, slightly rough"',
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

  /**
   * Get available sensory types for a region, excluding already-used combinations.
   * This prevents users from selecting the same region+type twice.
   */
  const getAvailableSensoryTypes = (
    region: BodyRegion,
    currentIdx: number
  ): { type: SensoryType; label: string; disabled: boolean }[] => {
    return SENSORY_TYPES.map((type) => ({
      type,
      label: SENSORY_LABELS[type],
      disabled: isSensoryCombinationUsed(bodySensory, region, type, currentIdx),
    }));
  };

  const handleRegionChange = (idx: number, newRegion: BodyRegion) => {
    // When region changes, find the first available sensory type for that region
    const availableTypes = getAvailableSensoryTypes(newRegion, idx);
    const firstAvailable = availableTypes.find((t) => !t.disabled);
    const defaultType = firstAvailable?.type ?? 'scent';

    updateBodyEntry(idx, 'region', newRegion);
    updateBodyEntry(idx, 'type', defaultType);
    updateBodyEntry(idx, 'raw', '');
  };

  const handleTypeChange = (idx: number, newType: SensoryType) => {
    const entry = bodySensory[idx];
    if (!entry) return;

    // Check if this combination is already used
    if (isSensoryCombinationUsed(bodySensory, entry.region, newType, idx)) {
      // Don't allow selecting a used combination
      return;
    }

    updateBodyEntry(idx, 'type', newType);
    updateBodyEntry(idx, 'raw', '');
  };

  /**
   * Handle description changes with auto-add functionality.
   * When the last entry's description is populated,
   * automatically add a new empty entry for the next available combination.
   */
  const handleRawChange = (idx: number, newRaw: string) => {
    updateBodyEntry(idx, 'raw', newRaw);

    // Auto-add: if this is the last entry and raw is now populated, add a new entry
    const isLastEntry = idx === bodySensory.length - 1;
    const entry = bodySensory[idx];
    if (!entry) return;
    const hasRegion = entry.region && entry.region.trim() !== '';
    const hasType = entry.type && entry.type.trim() !== '';
    const hasRaw = newRaw.trim() !== '';

    if (isLastEntry && hasRegion && hasType && hasRaw) {
      // Find the next available combination
      const usedCombos = getUsedSensoryCombinations(bodySensory);
      // Also mark the current entry as used (since we just set a value)
      usedCombos.add(`${entry.region}:${entry.type}`);

      const nextEntry = findNextAvailableSensoryEntry(usedCombos, availableRegions);
      if (nextEntry) {
        addBodyEntry(nextEntry);
      }
    }
  };

  /**
   * Check if all sensory combinations have been used.
   */
  const allCombinationsUsed = (): boolean => {
    const usedCombos = getUsedSensoryCombinations(bodySensory);
    return findNextAvailableSensoryEntry(usedCombos, availableRegions) === null;
  };

  /**
   * Handle adding a new entry manually - finds next available combination.
   */
  const handleAddEntry = () => {
    const usedCombos = getUsedSensoryCombinations(bodySensory);
    const nextEntry = findNextAvailableSensoryEntry(usedCombos, availableRegions);
    if (nextEntry) {
      addBodyEntry(nextEntry);
    }
  };

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <span>Body Sensory Data</span>
          <span className="text-xs text-slate-500">Per-region scent, texture, and flavor</span>
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

        {bodySensory.map((entry, idx) => {
          const availableTypes = getAvailableSensoryTypes(entry.region, idx);

          return (
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
                    onChange={(e) => handleRegionChange(idx, e.target.value as BodyRegion)}
                  >
                    {availableRegions.map((region) => (
                      <option key={region} value={region}>
                        {formatRegionLabel(region)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Sensory Type</span>
                  <select
                    className="bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-800 focus:ring-2 focus:ring-violet-500"
                    value={entry.type}
                    onChange={(e) => handleTypeChange(idx, e.target.value as SensoryType)}
                  >
                    {availableTypes.map(({ type, label, disabled }) => (
                      <option key={type} value={type} disabled={disabled}>
                        {label}
                        {disabled ? ' (used)' : ''}
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
                    onChange={(e) => handleRawChange(idx, e.target.value)}
                  />
                </label>
              </div>
            </div>
          );
        })}

        {!allCombinationsUsed() && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-800 hover:bg-slate-800"
            onClick={handleAddEntry}
          >
            + Add Sensory Entry
          </button>
        )}
      </div>
    </div>
  );
};
