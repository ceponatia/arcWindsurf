import { z } from 'zod';
import { WorldEventSchema } from '../events/index.js';

export const CognitionTaskContextSchema = z.object({
  lastEvents: z.array(WorldEventSchema),
  availableTools: z.array(z.string()),
  memoryContext: z.string().optional(),
});

export const CognitionTaskSchema = z.object({
  actorId: z.string(),
  context: CognitionTaskContextSchema,
});

export type CognitionTaskContext = z.infer<typeof CognitionTaskContextSchema>;
export type CognitionTask = z.infer<typeof CognitionTaskSchema>;
