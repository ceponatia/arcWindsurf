import { z } from 'zod';

export const AutoDefaultsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  excludeRegions: z.array(z.string()).optional(),
});

export const TemplateSelectionSchema = z.object({
  templateId: z.string(),
  weight: z.number().min(0).max(1).default(1),
});

export const TemplateBlendConfigSchema = z.object({
  templates: z.array(TemplateSelectionSchema).default([]),
  blendMode: z.enum(['weighted', 'layered']).default('weighted'),
});

export const SensoryProfileConfigSchema = z.object({
  autoDefaults: AutoDefaultsConfigSchema.default({ enabled: true }),
  templateBlend: TemplateBlendConfigSchema.optional(),
  conditionalAugmentations: z.record(z.string(), z.boolean()).optional(),
});

export type SensoryProfileConfig = z.infer<typeof SensoryProfileConfigSchema>;
export type TemplateBlendConfig = z.infer<typeof TemplateBlendConfigSchema>;
export type AutoDefaultsConfig = z.infer<typeof AutoDefaultsConfigSchema>;
export type TemplateSelection = z.infer<typeof TemplateSelectionSchema>;
