import { z } from 'zod';

export const TagDefinitionSchema = z.object({
  id: z.string().uuid(),
  owner: z.string().min(1),
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(500).optional(),
  promptText: z.string().min(1).max(10000),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TagDefinition = z.infer<typeof TagDefinitionSchema>;

export const SessionTagInstanceSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  tagId: z.string().uuid().nullable(),
  name: z.string(),
  shortDescription: z.string().optional(),
  promptText: z.string(),
  createdAt: z.date().optional(),
});

export type SessionTagInstance = z.infer<typeof SessionTagInstanceSchema>;
