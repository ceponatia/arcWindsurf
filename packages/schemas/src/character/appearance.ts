import { z } from 'zod';

// Single sources of truth for build/physique enums
export const APPEARANCE_HEIGHTS = ['dwarfish', 'short', 'average', 'tall', 'giant'] as const;
export type AppearanceHeight = (typeof APPEARANCE_HEIGHTS)[number];

export const APPEARANCE_TORSOS = [
  'lithe',
  'nubile',
  'average',
  'athletic',
  'heavy',
  'obese',
] as const;
export type AppearanceTorso = (typeof APPEARANCE_TORSOS)[number];

export const APPEARANCE_ARMS_BUILD = [
  'very skinny',
  'slender',
  'average',
  'toned',
  'muscular',
] as const;
export type AppearanceArmsBuild = (typeof APPEARANCE_ARMS_BUILD)[number];

export const APPEARANCE_ARMS_LENGTH = ['average', 'long', 'short'] as const;
export type AppearanceArmsLength = (typeof APPEARANCE_ARMS_LENGTH)[number];

export const APPEARANCE_LEGS_LENGTH = ['average', 'long', 'short'] as const;
export type AppearanceLegsLength = (typeof APPEARANCE_LEGS_LENGTH)[number];

export const APPEARANCE_FEET_SIZES = ['tiny', 'petite', 'small', 'average', 'large'] as const;
export type AppearanceFeetSize = (typeof APPEARANCE_FEET_SIZES)[number];

export const APPEARANCE_LEGS_BUILD = [
  'very skinny',
  'slender',
  'average',
  'toned',
  'muscular',
] as const;
export type AppearanceLegsBuild = (typeof APPEARANCE_LEGS_BUILD)[number];

// Build: proportions, shape, physique, base skin
export const BuildSchema = z.object({
  height: z.enum(APPEARANCE_HEIGHTS).default('average'),
  torso: z.enum(APPEARANCE_TORSOS).default('average'),
  skinTone: z.string().min(1).default('pale'),
  arms: z.object({
    build: z.enum(APPEARANCE_ARMS_BUILD).default('average'),
    length: z.enum(APPEARANCE_ARMS_LENGTH).default('average'),
  }),
  legs: z.object({
    length: z.enum(APPEARANCE_LEGS_LENGTH).default('average'),
    build: z.enum(APPEARANCE_LEGS_BUILD).default('toned'),
  }),
  feet: z.object({
    size: z.enum(APPEARANCE_FEET_SIZES).default('small'),
    shape: z.string().min(1).default('average'),
  }),
});

export type Build = z.infer<typeof BuildSchema>;

// Appearance: hair, eyes, distinguishing marks, etc.
export const AppearanceSchema = z.object({
  hair: z.object({
    color: z.string().min(1).default('brown'),
    style: z.string().min(1).default('straight'),
    length: z.string().min(1).default('medium'),
  }),
  eyes: z.object({
    color: z.string().min(1).default('brown'),
  }),
  features: z.array(z.string().min(1)).optional(),
});

export type Appearance = z.infer<typeof AppearanceSchema>;

// Combined physical description bucket
export const PhysiqueSchema = z.object({
  build: BuildSchema,
  appearance: AppearanceSchema,
});

export type Physique = z.infer<typeof PhysiqueSchema>;
