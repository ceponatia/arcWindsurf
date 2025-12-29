import {
  ARMS_REGIONS,
  BODY_REGIONS,
  FEET_REGIONS,
  GROIN_REGIONS,
  HEAD_REGIONS,
  LEG_REGIONS,
  NECK_REGIONS,
  TORSO_REGIONS,
  UPPER_BODY_REGIONS,
  type BodyRegion,
} from '../body-regions/index.js';

/**
 * Body region groups for batch hygiene updates.
 *
 * NOTE: Groups are used for bulk updates, but regions remain individually addressable.
 * A future enhancement may support asymmetric sub-region hygiene (e.g. left vs right).
 */
export const BODY_REGION_GROUPS = {
  head: HEAD_REGIONS,
  neck: NECK_REGIONS,
  upperBody: UPPER_BODY_REGIONS,
  torso: TORSO_REGIONS,
  arms: ARMS_REGIONS,
  groin: GROIN_REGIONS,
  legs: LEG_REGIONS,
  feet: FEET_REGIONS,
} as const satisfies Record<string, readonly BodyRegion[]>;

export type BodyRegionGroup = keyof typeof BODY_REGION_GROUPS;

/**
 * Get regions in a group.
 */
export function getRegionsInGroup(group: BodyRegionGroup): readonly BodyRegion[] {
  return BODY_REGION_GROUPS[group];
}

/**
 * Return the first group containing a region.
 */
export function getGroupForRegion(region: BodyRegion): BodyRegionGroup | undefined {
  for (const [group, regions] of Object.entries(BODY_REGION_GROUPS) as [
    BodyRegionGroup,
    readonly BodyRegion[],
  ][]) {
    if (regions.includes(region)) {
      return group;
    }
  }
  return undefined;
}

/**
 * Validate that BODY_REGION_GROUPS covers only known regions.
 * (Runtime safe-guard for future edits.)
 */
export function isValidGroupedRegion(region: string): region is BodyRegion {
  return BODY_REGIONS.includes(region as BodyRegion);
}
