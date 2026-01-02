import type { BodyRegion } from '../regions.js';
import type { HygieneLevel } from '../../state/hygiene.js';
import type { RegionScent } from '../../body-regions/sensory-types.js';
import type { BodyMap } from '../sensory.js';
import { SCENT_TIERS } from './scent-tiers.js';
import { DEFAULT_SCENTS, HYGIENE_SCENT_MODIFIERS } from './default-scents.js';

export interface ResolvedScentContext {
  source: 'user-defined' | 'tier-default' | 'none';
  scent: RegionScent | undefined;
  hygieneLevel: HygieneLevel;
  modifiedIntensity: number;
  modifiedNotes: string[];
}

type HygieneModulatedRegion = (typeof SCENT_TIERS)['hygieneModulated'][number];

function isHygieneModulatedRegion(region: BodyRegion): region is HygieneModulatedRegion {
  return (SCENT_TIERS.hygieneModulated as readonly BodyRegion[]).includes(region);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mergeNotes(a: readonly string[] | undefined, b: readonly string[] | undefined): string[] {
  const out: string[] = [];
  for (const item of a ?? []) {
    if (!out.includes(item)) out.push(item);
  }
  for (const item of b ?? []) {
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

/**
 * Resolve scent for a region using a fallback chain and optional hygiene modulation.
 *
 * Fallback order:
 * 1) user-defined bodyMap[region].scent
 * 2) tier default for the region
 * 3) undefined
 */
export function resolveRegionScent(
  bodyMap: BodyMap | undefined,
  region: BodyRegion,
  hygieneLevel: HygieneLevel = 0
): ResolvedScentContext {
  const userDefined = bodyMap?.[region]?.scent;
  const tierDefault = DEFAULT_SCENTS[region];

  const base: RegionScent | undefined = userDefined ?? tierDefault;
  const source: ResolvedScentContext['source'] = userDefined
    ? 'user-defined'
    : tierDefault
      ? 'tier-default'
      : 'none';

  if (!base) {
    return {
      source,
      scent: undefined,
      hygieneLevel,
      modifiedIntensity: 0,
      modifiedNotes: [],
    };
  }

  if (!isHygieneModulatedRegion(region)) {
    return {
      source,
      scent: base,
      hygieneLevel,
      modifiedIntensity: base.intensity,
      modifiedNotes: base.notes ?? [],
    };
  }

  const profile = HYGIENE_SCENT_MODIFIERS[region];
  const modifiers = profile?.[hygieneLevel];
  const modifier = modifiers?.scent;

  const mergedNotes = mergeNotes(base.notes, modifier?.notes);
  const modifiedIntensity = clamp01(modifier?.intensity ?? base.intensity);

  const resolved: RegionScent = {
    primary: modifier?.primary ?? base.primary,
    intensity: modifiedIntensity,
    ...(mergedNotes.length ? { notes: mergedNotes } : {}),
  };

  return {
    source,
    scent: resolved,
    hygieneLevel,
    modifiedIntensity,
    modifiedNotes: mergedNotes,
  };
}
