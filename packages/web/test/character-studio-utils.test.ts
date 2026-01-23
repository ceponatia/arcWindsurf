import { describe, it, expect } from 'vitest';
import {
  getUsedAppearanceCombinations,
  findNextAvailableAppearanceEntry,
  isAppearanceCombinationUsed,
  getUsedSensoryCombinations,
  findNextAvailableSensoryEntry,
  isSensoryCombinationUsed,
} from '../src/features/character-studio/utils.js';
import {
  APPEARANCE_REGIONS,
  APPEARANCE_REGION_ATTRIBUTES,
  BODY_REGIONS,
} from '@minimal-rpg/schemas';

describe('character studio utils', () => {
  it('tracks appearance combinations', () => {
    const entries = [{ region: APPEARANCE_REGIONS[0], attribute: 'color', value: 'red' }];
    const used = getUsedAppearanceCombinations(entries);
    expect(used.size).toBe(1);
    expect(isAppearanceCombinationUsed(entries, APPEARANCE_REGIONS[0], 'color')).toBe(true);
  });

  it('finds next available appearance entry', () => {
    const region = APPEARANCE_REGIONS[0];
    const attrs = APPEARANCE_REGION_ATTRIBUTES[region];
    const firstAttr = Object.keys(attrs)[0] ?? 'color';
    const used = new Set<string>([`${region}:${firstAttr}`]);
    const next = findNextAvailableAppearanceEntry(used, [region]);
    expect(next?.region).toBe(region);
  });

  it('tracks sensory combinations', () => {
    const entries = [{ region: BODY_REGIONS[0], type: 'scent', raw: 'clean' }];
    const used = getUsedSensoryCombinations(entries);
    expect(used.size).toBe(1);
    expect(isSensoryCombinationUsed(entries, BODY_REGIONS[0], 'scent')).toBe(true);
  });

  it('finds next available sensory entry', () => {
    const region = BODY_REGIONS[0];
    const used = new Set<string>([`${region}:scent`]);
    const next = findNextAvailableSensoryEntry(used, [region]);
    expect(next?.region).toBe(region);
  });
});
