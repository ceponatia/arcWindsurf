import { z } from 'zod';
import { BODY_REGIONS, type BodyRegion } from './regions.js';
import type { HygieneLevel } from '../state/hygiene.js';
import { DEFAULT_SCENTS, HYGIENE_SCENT_MODIFIERS, SCENT_TIERS } from './scent-defaults.js';

// ============================================================================
// Body Region Descriptors (Sensory Data)
// ============================================================================
// Optional descriptors that can be attached to body regions for rich detail.
// These represent intrinsic properties of the body region itself.
// ============================================================================

/**
 * Scent descriptor for a body region.
 */
export const RegionScentSchema = z.object({
  /** Primary scent note (e.g., "lavender", "musk", "sweat") */
  primary: z.string().min(1).max(80),
  /** Secondary/background notes */
  notes: z.array(z.string().min(1).max(80)).max(4).optional(),
  /** Scent intensity (0 = unnoticeable, 1 = overwhelming) */
  intensity: z.number().min(0).max(1).default(0.5),
});

export type RegionScent = z.infer<typeof RegionScentSchema>;

/**
 * Texture/touch descriptor for a body region.
 */
export const RegionTextureSchema = z.object({
  /** Primary texture (e.g., "soft", "rough", "smooth", "calloused") */
  primary: z.string().min(1).max(80),
  /** Temperature relative to normal (cold, cool, warm, hot) */
  temperature: z.enum(['cold', 'cool', 'neutral', 'warm', 'hot']).default('neutral'),
  /** Moisture level */
  moisture: z.enum(['dry', 'normal', 'damp', 'wet']).default('normal'),
  /** Additional texture notes */
  notes: z.array(z.string().min(1).max(80)).max(4).optional(),
});

export type RegionTexture = z.infer<typeof RegionTextureSchema>;

/**
 * Visual descriptor for a body region.
 */
export const RegionVisualSchema = z.object({
  /** Primary visual description */
  description: z.string().min(1).max(200),
  /** Notable features or marks */
  features: z.array(z.string().min(1).max(100)).max(8).optional(),
  /** Skin condition for this region */
  skinCondition: z
    .enum(['flawless', 'normal', 'freckled', 'scarred', 'tattooed', 'marked'])
    .optional(),
});

export type RegionVisual = z.infer<typeof RegionVisualSchema>;

/**
 * Flavor/taste descriptor for a body region.
 */
export const RegionFlavorSchema = z.object({
  /** Primary flavor note (e.g., "salty", "sweet", "metallic", "bitter") */
  primary: z.string().min(1).max(80),
  /** Secondary/background flavor notes */
  notes: z.array(z.string().min(1).max(80)).max(4).optional(),
  /** Flavor intensity (0 = barely noticeable, 1 = overwhelming) */
  intensity: z.number().min(0).max(1).default(0.5),
});

export type RegionFlavor = z.infer<typeof RegionFlavorSchema>;

/**
 * Complete sensory data for a single body region.
 * All fields are optional to allow partial specification.
 */
export const BodyRegionDataSchema = z.object({
  /** Visual appearance of this region */
  visual: RegionVisualSchema.optional(),
  /** Scent of this region */
  scent: RegionScentSchema.optional(),
  /** Texture/touch feel of this region */
  texture: RegionTextureSchema.optional(),
  /** Flavor/taste of this region */
  flavor: RegionFlavorSchema.optional(),
});

export type BodyRegionData = z.infer<typeof BodyRegionDataSchema>;

// ============================================================================
// Body Map Schema
// ============================================================================
// Maps body regions to their sensory data. Fully optional - only specify
// regions that have notable characteristics.
// ============================================================================

/**
 * Complete body map with optional sensory data for each region.
 * Only include regions that have notable/distinctive characteristics.
 *
 * Example usage:
 * ```ts
 * const body: BodyMap = {
 *   hair: {
 *     scent: { primary: "lavender shampoo", intensity: 0.6 },
 *     visual: { description: "Long, wavy auburn hair" }
 *   },
 *   hands: {
 *     texture: { primary: "calloused", temperature: "warm" },
 *     visual: { description: "Strong, weathered hands" }
 *   }
 * }
 * ```
 */
const BODY_MAP_SHAPE = Object.fromEntries(
  BODY_REGIONS.map((region) => [region, BodyRegionDataSchema.optional()])
) as Record<BodyRegion, z.ZodOptional<typeof BodyRegionDataSchema>>;

export const BodyMapSchema = z.object(BODY_MAP_SHAPE).partial();

export type BodyMap = z.infer<typeof BodyMapSchema>;

// ============================================================================
// Resolvers
// ============================================================================

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

  const modifier = HYGIENE_SCENT_MODIFIERS[region][hygieneLevel];

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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get scent data for a specific body region, with fallback chain.
 * If the specific region has no scent, falls back to torso (general body scent).
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The scent data, or undefined if none found
 */
export function getRegionScent(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionScent | undefined {
  if (!bodyMap) return undefined;

  // Try the specific region first
  const regionData = bodyMap[region];
  if (regionData?.scent) {
    return regionData.scent;
  }

  // Fallback to torso for general body scent (unless already checking torso)
  if (region !== 'torso') {
    return bodyMap.torso?.scent;
  }

  return undefined;
}

/**
 * Get texture data for a specific body region.
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The texture data, or undefined if none found
 */
export function getRegionTexture(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionTexture | undefined {
  if (!bodyMap) return undefined;
  return bodyMap[region]?.texture;
}

/**
 * Get visual data for a specific body region.
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The visual data, or undefined if none found
 */
export function getRegionVisual(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionVisual | undefined {
  if (!bodyMap) return undefined;
  return bodyMap[region]?.visual;
}

/**
 * Get flavor data for a specific body region.
 *
 * @param bodyMap - The character's body map
 * @param region - The target region
 * @returns The flavor data, or undefined if none found
 */
export function getRegionFlavor(
  bodyMap: BodyMap | undefined,
  region: BodyRegion
): RegionFlavor | undefined {
  if (!bodyMap) return undefined;
  return bodyMap[region]?.flavor;
}

/**
 * Get all regions that have scent data defined.
 */
export function getScentRegions(bodyMap: BodyMap | undefined): BodyRegion[] {
  if (!bodyMap) return [];

  return BODY_REGIONS.filter((region) => bodyMap[region]?.scent !== undefined);
}

/**
 * Get all regions that have flavor data defined.
 */
export function getFlavorRegions(bodyMap: BodyMap | undefined): BodyRegion[] {
  if (!bodyMap) return [];

  return BODY_REGIONS.filter((region) => bodyMap[region]?.flavor !== undefined);
}

/**
 * Build a flat scent summary from body map (for backwards compatibility with old ScentSchema).
 * Returns a record with keys like "hairScent", "bodyScent" etc.
 */
export function buildLegacyScentSummary(bodyMap: BodyMap | undefined): Record<string, string> {
  if (!bodyMap) return {};

  const result: Record<string, string> = {};

  if (bodyMap.hair?.scent) {
    result['hairScent'] = bodyMap.hair.scent.primary;
  }

  if (bodyMap.torso?.scent) {
    result['bodyScent'] = bodyMap.torso.scent.primary;
  }

  // Check for perfume-like scents on neck/chest (common perfume application areas)
  const perfumeRegions: BodyRegion[] = ['neck', 'chest'];
  for (const region of perfumeRegions) {
    const scent = bodyMap[region]?.scent;
    if (scent && !result['perfume']) {
      result['perfume'] = scent.primary;
    }
  }

  return result;
}
