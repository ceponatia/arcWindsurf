import { z } from 'zod';

export const MessageRequestSchema = z.object({
  content: z.string().min(1).max(4000),
});


export const CreateSessionRequestSchema = z.object({
  characterId: z.string().trim().min(1),
  settingId: z.string().trim().min(1),
  tagIds: z.array(z.string()).optional(),
});


export const CreateNpcInstanceRequestSchema = z.object({
  templateId: z.string().trim().min(1),
  role: z.string().optional(),
  label: z.string().optional(),
});

export type CreateNpcInstanceRequest = z.infer<typeof CreateNpcInstanceRequestSchema>;
