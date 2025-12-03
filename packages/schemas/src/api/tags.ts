import { z } from 'zod';
import { TagDefinitionSchema } from '../tags/index.js';

export const CreateTagRequestSchema = z.object({
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(500).optional(),
  promptText: z.string().min(1).max(10000),
});

export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;

export const UpdateTagRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  shortDescription: z.string().max(500).optional(),
  promptText: z.string().min(1).max(10000).optional(),
});

export type UpdateTagRequest = z.infer<typeof UpdateTagRequestSchema>;

export const TagResponseSchema = TagDefinitionSchema;
export type TagResponse = z.infer<typeof TagResponseSchema>;

export const SessionTagSelectionSchema = z.array(z.string().uuid());
export type SessionTagSelection = z.infer<typeof SessionTagSelectionSchema>;
