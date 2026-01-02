import { z } from 'zod';

// ============================================================================
// Body Region Descriptors (Sensory Data)
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
  /** Specific appearance attributes (e.g. hairColor, eyeShape) */
  appearance: z.record(z.string(), z.string()).optional(),
  /** Scent of this region */
  scent: RegionScentSchema.optional(),
  /** Texture/touch feel of this region */
  texture: RegionTextureSchema.optional(),
  /** Flavor/taste of this region */
  flavor: RegionFlavorSchema.optional(),
});

export type BodyRegionData = z.infer<typeof BodyRegionDataSchema>;
