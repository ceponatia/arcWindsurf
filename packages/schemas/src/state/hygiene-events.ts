import { BODY_REGIONS, type BodyRegion } from '../character/regions.js';
import {
  BODY_REGION_GROUPS,
  type BodyRegionGroup,
  getRegionsInGroup,
} from '../character/body-region-groups.js';
import {
  DEFAULT_HYGIENE_THRESHOLDS,
  type BodyPartHygieneConfig,
  type HygieneLevel,
  type NpcHygieneState,
} from './hygiene.js';
import { getTuple, setRecord, getRecordOptional } from '../shared/record-helpers.js';

export const CLEANING_EVENTS = {
  fullBath: { levelDelta: -5, affectedGroups: 'all' },
  quickWash: { levelDelta: -2, affectedGroups: ['head', 'arms', 'torso'] },
  swimming: { levelDelta: -4, affectedGroups: 'all' },
  rain: { levelDelta: -1, affectedGroups: ['head', 'neck', 'upperBody'] },
  handWash: { levelDelta: -2, affectedGroups: ['arms'] },
  footBath: { levelDelta: -3, affectedGroups: ['feet'] },
} as const;

export const DIRTYING_EVENTS = {
  mud: { levelDelta: 2, affectedGroups: ['feet', 'legs'] },
  sweat: { levelDelta: 1, affectedGroups: ['arms', 'groin', 'feet'] },
  intimacy: { levelDelta: 1, affectedGroups: ['groin', 'torso'] },
  vomit: { levelDelta: 3, affectedGroups: ['head', 'torso'] },
  blood: { levelDelta: 2, affectedGroups: 'variable' },
  dust: { levelDelta: 1, affectedGroups: ['head', 'upperBody', 'arms'] },
} as const;

export type CleaningEvent = keyof typeof CLEANING_EVENTS;
export type DirtyingEvent = keyof typeof DIRTYING_EVENTS;

export type HygieneEvent =
  | { kind: 'clean'; event: CleaningEvent }
  | { kind: 'dirty'; event: DirtyingEvent; bodyParts?: BodyRegion[] };

type AffectedGroups = 'all' | 'variable' | readonly BodyRegionGroup[] | readonly BodyRegion[];

type HygieneThresholdsTuple = readonly [number, number, number, number, number, number, number];

const DEFAULT_THRESHOLDS = DEFAULT_HYGIENE_THRESHOLDS as unknown as HygieneThresholdsTuple;

function clampHygieneLevelLocal(level: number): HygieneLevel {
  return Math.min(6, Math.max(0, Math.floor(level))) as HygieneLevel;
}

function getMinPointsForLevelLocal(
  level: HygieneLevel,
  thresholds: HygieneThresholdsTuple = DEFAULT_THRESHOLDS
): number {
  return getTuple(thresholds, level);
}

function resolveAffectedBodyParts(
  affected: AffectedGroups,
  bodyPartsOverride?: readonly BodyRegion[]
): BodyRegion[] {
  if (affected === 'all') {
    return [...BODY_REGIONS];
  }

  if (affected === 'variable') {
    return bodyPartsOverride ? [...bodyPartsOverride] : [];
  }

  const values = [...affected];
  if (values.length === 0) return [];

  // If every entry is a known group key, treat as groups; otherwise treat as regions.
  const isGroupList = values.every((v) => v in BODY_REGION_GROUPS);

  if (isGroupList) {
    const result: BodyRegion[] = [];
    for (const group of values as BodyRegionGroup[]) {
      result.push(...getRegionsInGroup(group));
    }
    return result;
  }

  // Region list (validated against BODY_REGIONS for safety)
  return values.filter((v): v is BodyRegion => BODY_REGIONS.includes(v as BodyRegion));
}

/**
 * Apply a discrete hygiene event that shifts hygiene levels for affected body parts.
 *
 * This is a level-based adjustment (not point-based). Points are re-derived to the
 * minimum points for the resulting level.
 */
export function applyHygieneEvent(
  state: NpcHygieneState,
  event: HygieneEvent,
  decayRates?: Record<string, BodyPartHygieneConfig>,
  at: Date = new Date()
): NpcHygieneState {
  const now = at.toISOString();
  const nextBodyParts: Record<
    string,
    { points: number; level: number; lastUpdatedAt?: string | undefined }
  > = {
    ...state.bodyParts,
  };

  if (event.kind === 'clean') {
    const spec = CLEANING_EVENTS[event.event];
    const affected = resolveAffectedBodyParts(spec.affectedGroups, undefined);

    for (const part of affected) {
      const current = getRecordOptional(nextBodyParts, part) ?? {
        points: 0,
        level: 0,
      };
      const nextLevel = clampHygieneLevelLocal(current.level + spec.levelDelta);
      const thresholds = (getRecordOptional(decayRates, part)?.thresholds ??
        DEFAULT_THRESHOLDS) as unknown as HygieneThresholdsTuple;

      setRecord(nextBodyParts, part, {
        points: getMinPointsForLevelLocal(nextLevel, thresholds),
        level: nextLevel,
        lastUpdatedAt: now,
      });
    }

    return { ...state, bodyParts: nextBodyParts };
  }

  const spec = DIRTYING_EVENTS[event.event];
  const affected = resolveAffectedBodyParts(spec.affectedGroups, event.bodyParts);

  for (const part of affected) {
    const current = getRecordOptional(nextBodyParts, part) ?? {
      points: 0,
      level: 0,
    };
    const nextLevel = clampHygieneLevelLocal(current.level + spec.levelDelta);
    const thresholds = (getRecordOptional(decayRates, part)?.thresholds ??
      DEFAULT_THRESHOLDS) as unknown as HygieneThresholdsTuple;

    setRecord(nextBodyParts, part, {
      points: getMinPointsForLevelLocal(nextLevel, thresholds),
      level: nextLevel,
      lastUpdatedAt: now,
    });
  }

  return { ...state, bodyParts: nextBodyParts };
}

/**
 * Assert group definitions stay aligned with BODY_REGIONS.
 *
 * This is a lightweight runtime check helpers can use in tests.
 */
export function assertBodyRegionGroups(): void {
  for (const regions of Object.values(BODY_REGION_GROUPS)) {
    for (const region of regions) {
      if (!BODY_REGIONS.includes(region)) {
        throw new Error(`Invalid region in BODY_REGION_GROUPS: ${region}`);
      }
    }
  }
}
