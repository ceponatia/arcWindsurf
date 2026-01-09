import { getRecordOptional, setRecord } from '../shared/record-helpers.js';
import { REGION_HIERARCHY, RACE_EXCLUSIONS, GENDER_EXCLUSIONS } from './hierarchy.js';

/**
 * Filters the body region hierarchy based on race and gender.
 *
 * @param race - The character's race (e.g., 'human', 'golem')
 * @param gender - The character's gender (e.g., 'male', 'female')
 * @returns A filtered version of the REGION_HIERARCHY
 */
export const getFilteredHierarchy = (
  race = 'human',
  gender = 'other'
): Record<string, string[]> => {
  const raceKey = race.toLowerCase();
  const genderKey = gender.toLowerCase();

  const raceExclusions = getRecordOptional(RACE_EXCLUSIONS, raceKey) ?? [];
  const genderExclusions = getRecordOptional(GENDER_EXCLUSIONS, genderKey) ?? [];
  const allExclusions = new Set([...raceExclusions, ...genderExclusions]);

  const filtered: Record<string, string[]> = {};

  Object.entries(REGION_HIERARCHY).forEach(([region, subRegions]) => {
    // If the main region itself is excluded (e.g. 'legs' for slug)
    if (allExclusions.has(region)) return;

    const filteredSubRegions = subRegions.filter((sub) => !allExclusions.has(sub));

    if (filteredSubRegions.length > 0) {
      setRecord(filtered, region, filteredSubRegions);
    }
  });

  return filtered;
};
