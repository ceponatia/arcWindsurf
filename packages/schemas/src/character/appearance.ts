import { z } from 'zod';

// Single sources of truth for appearance enums
export const APPEARANCE_HEIGHTS = ['short', 'average', 'tall'] as const;
export type AppearanceHeight = (typeof APPEARANCE_HEIGHTS)[number];

export const APPEARANCE_TORSOS = ['slight', 'average', 'athletic', 'heavy'] as const;
export type AppearanceTorso = (typeof APPEARANCE_TORSOS)[number];

export const APPEARANCE_ARMS_BUILD = ['average', 'muscular', 'slender'] as const;
export type AppearanceArmsBuild = (typeof APPEARANCE_ARMS_BUILD)[number];

export const APPEARANCE_ARMS_LENGTH = ['average', 'long', 'short'] as const;
export type AppearanceArmsLength = (typeof APPEARANCE_ARMS_LENGTH)[number];

export const APPEARANCE_LEGS_LENGTH = ['average', 'long', 'short'] as const;
export type AppearanceLegsLength = (typeof APPEARANCE_LEGS_LENGTH)[number];

export const APPEARANCE_LEGS_BUILD = [
  'very skinny',
  'slender',
  'average',
  'toned',
  'muscular',
] as const;
export type AppearanceLegsBuild = (typeof APPEARANCE_LEGS_BUILD)[number];

// Reusable Appearance schema (machine-readable with optional free text)
export const AppearanceSchema = z.object({
  hair: z.object({
    color: z.string().min(1).default('brown'),
    style: z.string().min(1).default('straight'),
    length: z.string().min(1).default('medium'),
  }),
  eyes: z.object({
    color: z.string().min(1).default('brown'),
  }),
  height: z.enum(APPEARANCE_HEIGHTS).default('average'),
  torso: z.enum(APPEARANCE_TORSOS).default('average'),
  skinTone: z.string().min(1).default('pale'),
  features: z.array(z.string().min(1)).optional(),
  arms: z.object({
    build: z.enum(APPEARANCE_ARMS_BUILD).default('average'),
    length: z.enum(APPEARANCE_ARMS_LENGTH).default('average'),
  }),
  legs: z.object({
    length: z.enum(APPEARANCE_LEGS_LENGTH).default('average'),
    build: z.enum(APPEARANCE_LEGS_BUILD).default('toned'),
  }),
});

export type Appearance = z.infer<typeof AppearanceSchema>;
