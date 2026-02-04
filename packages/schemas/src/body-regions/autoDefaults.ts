import { getRecordOptional, setPartialRecord } from '../shared/record-helpers.js';
import type { CharacterProfile } from '../character/characterProfile.js';
import type { BodyMap } from '../character/body-map.js';
import { BODY_REGIONS } from './regions.js';
import { DEFAULT_SCENTS } from '../character/scent/default-scents.js';

const NEUTRAL_SCENT = {
  primary: 'neutral',
  intensity: 0.2,
} as const;

export function buildAutoDefaults(
  profile: Partial<CharacterProfile>,
  excludeRegions: string[] | undefined
): BodyMap {
  const excluded = new Set(excludeRegions ?? []);
  const result: BodyMap = {};

  void profile;

  for (const region of BODY_REGIONS) {
    if (excluded.has(region)) continue;

    const scent = getRecordOptional(DEFAULT_SCENTS, region) ?? NEUTRAL_SCENT;
    const notes = 'notes' in scent ? scent.notes : undefined;
    setPartialRecord(result, region, {
      scent: {
        primary: scent.primary,
        intensity: scent.intensity,
        ...(notes ? { notes } : {}),
      },
    });
  }

  return result;
}
