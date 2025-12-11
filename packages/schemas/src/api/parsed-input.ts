import { z } from 'zod';

export const SegmentTypeSchema = z.enum(['speech', 'thought', 'action']);

export const ParsedSegmentSchema = z.object({
  id: z.string(),
  type: SegmentTypeSchema,
  content: z.string(),
  observable: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  rawMarkers: z
    .object({
      prefix: z.string(),
      suffix: z.string(),
    })
    .optional(),
});

export const ParsedPlayerInputSchema = z.object({
  rawInput: z.string(),
  segments: z.array(ParsedSegmentSchema),
  primaryIntent: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

export type SegmentType = z.infer<typeof SegmentTypeSchema>;
export type ParsedSegment = z.infer<typeof ParsedSegmentSchema>;
export type ParsedPlayerInput = z.infer<typeof ParsedPlayerInputSchema>;
