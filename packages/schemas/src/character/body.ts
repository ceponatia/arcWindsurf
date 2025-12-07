import { z } from 'zod';

// ============================================================================
// Body Region Taxonomy
// ============================================================================
// Defines the canonical body regions with hierarchical relationships.
// This enables:
// - Atomic access to specific body parts for detailed descriptions
// - Aliasing for natural language parsing (e.g., "look at their feet" → feet)
// - Sensory data mapping (scents, textures, temperatures)
// - Intent routing for queries about specific body parts
//
// Note: Equipment slot mapping (body region → clothing slots) is handled
// separately in the governor package's equipment-resolver.ts to keep
// character schemas decoupled from item schemas.
// ============================================================================

/**
 * Primary body regions - major areas that can have distinct properties.
 * These are the canonical regions used throughout the system for:
 * - Sensory data (scent, texture, visual appearance)
 * - Equipment slots (what clothing/armor covers this region)
 * - Intent routing (resolving player queries about specific body parts)
 */
export const BODY_REGIONS = [
  'head',
  'face',
  'hair',
  'neck',
  'shoulders',
  'torso',
  'chest',
  'back',
  'arms',
  'hands',
  'waist',
  'hips',
  'legs',
  'feet',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

/**
 * Body region aliases map natural language references to canonical regions.
 * Used by intent detection and agents to resolve player input.
 *
 * Includes:
 * - Body part synonyms (e.g., "skull" → "head", "tummy" → "torso")
 * - Equipment references (e.g., "shoes" → "feet", "gloves" → "hands")
 *
 * Example: "I look at her shoes" → resolves to 'feet' region
 * Example: "I smell his hair" → resolves to 'hair' region
 * Example: "What is she wearing on her hands?" → resolves to 'hands' region
 */
export const BODY_REGION_ALIASES: Record<string, BodyRegion> = {
  // Head region aliases
  skull: 'head',
  scalp: 'hair',
  locks: 'hair',
  tresses: 'hair',
  mane: 'hair',

  // Face region aliases
  visage: 'face',
  countenance: 'face',
  features: 'face',
  eyes: 'face',
  nose: 'face',
  mouth: 'face',
  lips: 'face',
  cheeks: 'face',
  chin: 'face',
  jaw: 'face',
  forehead: 'face',
  brow: 'face',
  ears: 'face',

  // Neck aliases
  throat: 'neck',
  nape: 'neck',

  // Torso aliases (default for "general" smell)
  body: 'torso',
  trunk: 'torso',
  abdomen: 'torso',
  stomach: 'torso',
  belly: 'torso',
  midriff: 'torso',
  ribs: 'torso',
  side: 'torso',
  sides: 'torso',

  // Chest aliases
  breast: 'chest',
  breasts: 'chest',
  bosom: 'chest',
  bust: 'chest',
  pecs: 'chest',
  pectorals: 'chest',

  // Back aliases
  spine: 'back',
  shoulderblades: 'back',

  // Shoulder aliases
  shoulder: 'shoulders',

  // Arm aliases
  arm: 'arms',
  bicep: 'arms',
  biceps: 'arms',
  forearm: 'arms',
  forearms: 'arms',
  elbow: 'arms',
  elbows: 'arms',
  wrist: 'arms',
  wrists: 'arms',

  // Hand aliases
  hand: 'hands',
  palm: 'hands',
  palms: 'hands',
  fingers: 'hands',
  finger: 'hands',
  knuckles: 'hands',
  nails: 'hands',
  fingernails: 'hands',

  // Waist/hip aliases
  hip: 'hips',
  pelvis: 'hips',
  groin: 'hips',
  lap: 'hips',

  // Leg aliases
  leg: 'legs',
  thigh: 'legs',
  thighs: 'legs',
  calf: 'legs',
  calves: 'legs',
  knee: 'legs',
  knees: 'legs',
  shin: 'legs',
  shins: 'legs',
  ankle: 'legs',
  ankles: 'legs',

  // Foot aliases
  foot: 'feet',
  toes: 'feet',
  toe: 'feet',
  heel: 'feet',
  heels: 'feet',
  sole: 'feet',
  soles: 'feet',
  arch: 'feet',
  arches: 'feet',
  instep: 'feet',

  // Equipment-based aliases (item → body region it covers)
  shoes: 'feet',
  boots: 'feet',
  sandals: 'feet',
  socks: 'feet',
  footwear: 'feet',
  gloves: 'hands',
  gauntlets: 'hands',
  mittens: 'hands',
  hat: 'head',
  helmet: 'head',
  cap: 'head',
  hood: 'head',
  crown: 'head',
  mask: 'face',
  glasses: 'face',
  shirt: 'torso',
  jacket: 'torso',
  coat: 'torso',
  dress: 'torso',
  vest: 'torso',
  blouse: 'torso',
  sweater: 'torso',
  pants: 'legs',
  trousers: 'legs',
  skirt: 'legs',
  shorts: 'legs',
  leggings: 'legs',
  jeans: 'legs',
  belt: 'waist',
  necklace: 'neck',
  choker: 'neck',
  scarf: 'neck',
  collar: 'neck',
};

/**
 * Default body region for general/unspecified references.
 * When a player says "I smell them" without specifying a body part,
 * this region is used as the default.
 */
export const DEFAULT_BODY_REGION: BodyRegion = 'torso';

/**
 * Resolve a body part reference to a canonical region.
 * Returns the default region if no match is found.
 *
 * @param reference - The body part reference from player input
 * @param defaultRegion - Override for the default region (defaults to 'torso')
 */
export function resolveBodyRegion(
  reference: string | undefined | null,
  defaultRegion: BodyRegion = DEFAULT_BODY_REGION
): BodyRegion {
  if (!reference) {
    return defaultRegion;
  }

  const normalized = reference.toLowerCase().trim();

  // Check if it's already a canonical region
  if (BODY_REGIONS.includes(normalized as BodyRegion)) {
    return normalized as BodyRegion;
  }

  // Check aliases
  const aliased = BODY_REGION_ALIASES[normalized];
  if (aliased) {
    return aliased;
  }

  // Fuzzy match: check if any alias contains the reference or vice versa
  for (const [alias, region] of Object.entries(BODY_REGION_ALIASES)) {
    if (alias.includes(normalized) || normalized.includes(alias)) {
      return region;
    }
  }

  return defaultRegion;
}

/**
 * Check if a string is a valid body region or alias.
 */
export function isBodyReference(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return BODY_REGIONS.includes(normalized as BodyRegion) || normalized in BODY_REGION_ALIASES;
}

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
export const BodyMapSchema = z
  .object({
    head: BodyRegionDataSchema.optional(),
    face: BodyRegionDataSchema.optional(),
    hair: BodyRegionDataSchema.optional(),
    neck: BodyRegionDataSchema.optional(),
    shoulders: BodyRegionDataSchema.optional(),
    torso: BodyRegionDataSchema.optional(),
    chest: BodyRegionDataSchema.optional(),
    back: BodyRegionDataSchema.optional(),
    arms: BodyRegionDataSchema.optional(),
    hands: BodyRegionDataSchema.optional(),
    waist: BodyRegionDataSchema.optional(),
    hips: BodyRegionDataSchema.optional(),
    legs: BodyRegionDataSchema.optional(),
    feet: BodyRegionDataSchema.optional(),
  })
  .partial();

export type BodyMap = z.infer<typeof BodyMapSchema>;

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
 * Get all regions that have scent data defined.
 */
export function getScentRegions(bodyMap: BodyMap | undefined): BodyRegion[] {
  if (!bodyMap) return [];

  return BODY_REGIONS.filter((region) => bodyMap[region]?.scent !== undefined);
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
