import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiError } from '../types.js';

const GenerateRequestSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  history: z.array(z.object({ role: z.string(), content: z.string() })),
  userMessage: z.string(),
});

const InferTraitsRequestSchema = z.object({
  userMessage: z.string(),
  characterResponse: z.string(),
  currentProfile: z.record(z.string(), z.unknown()),
});

export function registerStudioRoutes(app: Hono): void {
  // POST /studio/generate - Generate character response
  app.post('/studio/generate', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = GenerateRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
      }

      const { profile, history, userMessage } = parsed.data;

      // TODO: Integrate with LLM provider
      // For now, return a placeholder response
      const response = `[Character response to: "${userMessage.slice(0, 50)}..."]`;

      return c.json({ content: response });
    } catch (error) {
      console.error('Generate endpoint error:', error);
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }
  });

  // POST /studio/infer-traits - Infer traits from conversation
  app.post('/studio/infer-traits', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = InferTraitsRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
      }

      const { userMessage, characterResponse, currentProfile } = parsed.data;

      // TODO: Use LLM to infer traits
      // For now, return empty array
      return c.json({ traits: [] });
    } catch (error) {
      console.error('Infer traits endpoint error:', error);
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }
  });
}
