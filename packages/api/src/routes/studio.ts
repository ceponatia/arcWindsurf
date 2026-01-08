import { Hono } from 'hono';
import type { ApiError } from '../types.js';

interface GenerateRequest {
  profile: Record<string, unknown>;
  history: { role: string; content: string }[];
  userMessage: string;
}

interface InferTraitsRequest {
  userMessage: string;
  characterResponse: string;
  currentProfile: Record<string, unknown>;
}

export function registerStudioRoutes(app: Hono): void {
  // POST /studio/generate - Generate character response
  app.post('/studio/generate', async (c) => {
    try {
      const body = await c.req.json();
      const { profile, history, userMessage } = body;

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
      const body = await c.req.json();
      const { userMessage, characterResponse, currentProfile } = body;

      // TODO: Use LLM to infer traits
      // For now, return empty array
      return c.json({ traits: [] });
    } catch (error) {
      console.error('Infer traits endpoint error:', error);
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }
  });
}
