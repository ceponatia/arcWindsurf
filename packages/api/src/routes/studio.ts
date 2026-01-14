import { OpenAIProvider, type LLMMessage, type LLMResponse, type LLMStreamChunk, type LLMProvider } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import {
  createStudioNpcActor,
  StudioNpcActor,
  DiscoveryGuide,
  type InferredTrait,
} from '@minimal-rpg/actors';
import {
  createStudioSession,
  getStudioSession,
  updateStudioSession,
  deleteStudioSession,
  cleanupExpiredSessions,
  type StudioSession,
} from '@minimal-rpg/db';
import { Cause, Effect, Exit } from 'effect';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { ApiError } from '../types.js';
import { getConfig } from '../utils/config.js';

// In-memory actor cache (actors are expensive to create)
const actorCache = new Map<string, StudioNpcActor>();

// Cleanup expired sessions on startup (background)
cleanupExpiredSessions().catch(err => console.warn('Failed to cleanup expired sessions:', err));

const cfg = getConfig();

const openrouterApiKey = cfg.openrouterApiKey;
const openrouterModel = cfg.openrouterModel;
const openrouterBaseUrl = 'https://openrouter.ai/api/v1';

const openaiApiKey = process.env['OPENAI_API_KEY'] ?? '';
const openaiModel = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
const openaiBaseUrl = process.env['OPENAI_BASE_URL'];

const defaultLlmProvider = openrouterApiKey
  ? new OpenAIProvider({
    id: 'studio',
    apiKey: openrouterApiKey,
    baseURL: openrouterBaseUrl,
    model: openrouterModel,
  })
  : openaiApiKey
    ? new OpenAIProvider({
      id: 'studio',
      apiKey: openaiApiKey,
      model: openaiModel,
      ...(typeof openaiBaseUrl === 'string' && openaiBaseUrl.length > 0
        ? { baseURL: openaiBaseUrl }
        : {}),
    })
    : null;

const ConversationRequestSchema = z.object({
  sessionId: z.string().optional(),
  profile: z.record(z.string(), z.unknown()),
  message: z.string(),
});

const SuggestPromptRequestSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  exploredTopics: z.array(z.string()).optional(),
});

const DilemmaRequestSchema = z.object({
  sessionId: z.string(),
  profile: z.record(z.string(), z.unknown()),
});

interface StudioError {
  ok: false;
  error: string;
  code: 'LLM_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'PARSE_ERROR' | 'CONFIG_ERROR';
  retryable: boolean;
}

export type StudioLlmProvider = Pick<LLMProvider, 'chat' | 'stream'>;

export interface RegisterStudioRoutesOptions {
  llmProvider?: StudioLlmProvider | null;
}

export function registerStudioRoutes(app: Hono, options?: RegisterStudioRoutesOptions): void {
  const llmProvider: StudioLlmProvider | null =
    options?.llmProvider === undefined ? defaultLlmProvider : options.llmProvider;

  async function runLlmEffect<T>(effect: Effect.Effect<T, unknown>): Promise<T> {
    const exit = await Effect.runPromiseExit(effect);
    if (Exit.isSuccess(exit)) return exit.value;

    const failures = Array.from(Cause.failures(exit.cause));
    if (failures.length > 0) {
      throw failures[0];
    }

    throw new Error(Cause.pretty(exit.cause));
  }

  const GenerateRequestSchema = z.object({
    profile: z.record(z.string(), z.unknown()),
    history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
    userMessage: z.string(),
  });

  const InferTraitsRequestSchema = z.object({
    userMessage: z.string(),
    characterResponse: z.string(),
    currentProfile: z.record(z.string(), z.unknown()),
  });

  const isHttpError = (err: unknown): err is { status: number } => {
    return typeof err === 'object' && err !== null && typeof (err as any)['status'] === 'number';
  };

  const toStudioError = (err: unknown): { status: number; body: StudioError } => {
    const status = isHttpError(err) ? err.status : 502;

    if (status === 429) {
      return {
        status: 429,
        body: {
          ok: false,
          error: getMessage(err) || 'Rate limited',
          code: 'RATE_LIMITED',
          retryable: true,
        },
      };
    }

    if (status === 504) {
      return {
        status: 504,
        body: {
          ok: false,
          error: getMessage(err) || 'Timeout',
          code: 'TIMEOUT',
          retryable: true,
        },
      };
    }

    return {
      status: 502,
      body: {
        ok: false,
        error: getMessage(err) || 'LLM unavailable',
        code: 'LLM_UNAVAILABLE',
        retryable: true,
      },
    };
  };

  // --------------------------------------------------------------------------
  // Legacy endpoints kept for compatibility + tests
  // --------------------------------------------------------------------------

  // POST /studio/generate - legacy non-streaming generation endpoint
  app.post('/studio/generate', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = GenerateRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
      }

      if (!llmProvider) {
        return c.json(
          {
            ok: false,
            error: 'LLM provider not configured',
            code: 'CONFIG_ERROR',
            retryable: false,
          } satisfies StudioError,
          503
        );
      }

      const { userMessage } = parsed.data;

      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are an RPG character. Respond naturally.' },
        { role: 'user', content: userMessage },
      ];

      const result = await runLlmEffect(llmProvider.chat(messages));

      return c.json({ ok: true, content: result.content ?? '' });
    } catch (error) {
      console.error('Studio generate error:', getMessage(error));
      const mapped = toStudioError(error);
      return c.json(mapped.body, mapped.status);
    }
  });

  // GET /studio/generate/stream - legacy SSE streaming endpoint
  app.get('/studio/generate/stream', async (c) => {
    if (!llmProvider) {
      return c.json(
        {
          ok: false,
          error: 'LLM provider not configured',
          code: 'CONFIG_ERROR',
          retryable: false,
        } satisfies StudioError,
        503
      );
    }

    const profileStr = c.req.query('profile') ?? '{}';
    const historyStr = c.req.query('history') ?? '[]';
    const userMessage = c.req.query('userMessage') ?? '';

    // We intentionally keep this lenient for compatibility.
    // These values are not used directly in this endpoint yet.
    void profileStr;
    void historyStr;

    return streamSSE(c, async (stream) => {
      try {
        const messages: LLMMessage[] = [
          { role: 'system', content: 'You are an RPG character. Respond naturally.' },
          { role: 'user', content: userMessage },
        ];

        const iterable = await runLlmEffect(llmProvider.stream(messages));

        for await (const chunk of iterable) {
          const delta = (chunk as any)?.choices?.[0]?.delta?.content;
          const content = typeof delta === 'string' ? delta : '';
          if (!content) continue;

          await stream.writeSSE({
            event: 'content',
            data: JSON.stringify({ content }),
          });
        }
      } catch (error) {
        console.error('Generate stream error:', getMessage(error));
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'stream_failed', message: getMessage(error) }),
        });
      } finally {
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({ done: true }),
        });
      }
    });
  });

  // POST /studio/infer-traits - legacy trait inference endpoint
  app.post('/studio/infer-traits', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = InferTraitsRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
      }

      if (!llmProvider) {
        return c.json(
          {
            ok: false,
            error: 'LLM provider not configured',
            code: 'CONFIG_ERROR',
            retryable: false,
          } satisfies StudioError,
          503
        );
      }

      const { userMessage, characterResponse } = parsed.data;

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'Infer personality traits from a conversation exchange. Output JSON array only.',
        },
        {
          role: 'user',
          content: JSON.stringify({ userMessage, characterResponse }),
        },
      ];

      const result = await runLlmEffect(llmProvider.chat(messages));

      try {
        const parsedJson = JSON.parse(result.content ?? '[]') as unknown;
        const traits = Array.isArray(parsedJson) ? parsedJson : [];
        return c.json({ traits }, 200);
      } catch {
        // Parse errors are non-critical and degrade gracefully.
        return c.json({ traits: [] }, 200);
      }
    } catch (error) {
      if (isHttpError(error) && error.status === 429) {
        console.error('Infer traits LLM error:', getMessage(error));
        const mapped = toStudioError(error);
        return c.json(mapped.body, mapped.status);
      }

      // For other errors, degrade gracefully.
      console.error('Infer traits LLM error:', getMessage(error));
      return c.json({ traits: [] }, 200);
    }
  });

  // POST /studio/conversation - Main conversation endpoint
  app.post('/studio/conversation', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = ConversationRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
      }

      if (!llmProvider) {
        return c.json(
          {
            ok: false,
            error: 'LLM provider not configured',
            code: 'CONFIG_ERROR',
            retryable: false,
          } satisfies StudioError,
          503
        );
      }

      const { message, profile } = parsed.data;
      let sessionId = parsed.data['sessionId'];

      // Get or create session
      let session: StudioSession | null = null;
      let actor: StudioNpcActor | undefined;

      if (sessionId) {
        session = await getStudioSession(sessionId);
        actor = actorCache.get(sessionId);
      }

      if (!session) {
        // Create new session
        sessionId = crypto.randomUUID();
        session = await createStudioSession(sessionId, profile);
      }

      if (!actor && sessionId) {
        // Create actor for this session
        actor = createStudioNpcActor({
          sessionId,
          profile: profile as Partial<CharacterProfile>,
          llmProvider,
        });
        actorCache.set(sessionId, actor);

        // Restore state if session had previous conversation
        if (session.conversation.length > 0) {
          actor.restoreState({
            conversation: session.conversation.map((m, idx) => ({
              id: `msg-${idx}`,
              content: m.content,
              role: m.role as 'user' | 'character' | 'system',
              timestamp: new Date(m.timestamp),
              thought: undefined,
            })),
            summary: session.summary,
            inferredTraits: session.inferredTraits as any[],
            exploredTopics: session.exploredTopics as any[],
          });
        }
      }

      if (!actor || !sessionId) {
        return c.json({ ok: false, error: 'Failed to initialize actor' }, 500);
      }

      // Update profile in actor
      actor.updateProfile(profile as Partial<CharacterProfile>);

      // Send message and get response
      const response = await actor.respond(message);

      // Persist updated state
      const state = actor.exportState();
      await updateStudioSession(sessionId, {
        profileSnapshot: profile,
        conversation: state.conversation.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        summary: state.summary,
        inferredTraits: state.inferredTraits,
        exploredTopics: Array.from(state.exploredTopics),
      });

      return c.json({
        ok: true,
        sessionId,
        response: response.response,
        thought: response.thought,
        inferredTraits: response.inferredTraits,
        suggestedPrompts: response.suggestedPrompts,
        meta: response.meta,
      });
    } catch (error) {
      console.error('Studio conversation error:', error);
      return c.json({ ok: false, error: 'Conversation failed' }, 500);
    }
  });

  // POST /studio/suggest-prompt - Get suggested prompts
  app.post('/studio/suggest-prompt', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = SuggestPromptRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' }, 400);
      }

      const { profile, exploredTopics } = parsed.data;

      const guide = new DiscoveryGuide({
        profile: profile as Partial<CharacterProfile>,
      });

      // Mark already explored topics
      if (exploredTopics) {
        for (const topic of exploredTopics) {
          guide.markExplored(topic as any);
        }
      }

      // Get suggested topic and prompts
      const topic = guide.suggestTopic();
      const prompts = guide.generatePrompts(topic, 3);

      return c.json({
        ok: true,
        topic,
        prompts,
        unexploredTopics: guide.getUnexploredTopics(),
      });
    } catch (error) {
      console.error('Suggest prompt error:', error);
      return c.json({ ok: false, error: 'Failed to generate prompts' }, 500);
    }
  });

  // POST /studio/dilemma - Generate a moral dilemma
  app.post('/studio/dilemma', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = DilemmaRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' }, 400);
      }

      const { sessionId, profile } = parsed.data;

      let actor = actorCache.get(sessionId);
      if (!actor) {
        // Try to restore from DB
        const session = await getStudioSession(sessionId);
        if (!session) {
          return c.json({ ok: false, error: 'Session not found' }, 404);
        }

        if (!llmProvider) {
          return c.json({ ok: false, error: 'LLM not configured' }, 503);
        }

        actor = createStudioNpcActor({
          sessionId,
          profile: profile as Partial<CharacterProfile>,
          llmProvider,
        });
        actorCache.set(sessionId, actor);
        actor.restoreState({
          conversation: session.conversation.map((m, idx) => ({
            id: `msg-${idx}`,
            content: m.content,
            role: m.role as any,
            timestamp: new Date(m.timestamp),
          })),
          summary: session.summary,
          inferredTraits: session.inferredTraits as any[],
          exploredTopics: session.exploredTopics as any[],
        });
      }

      actor.updateProfile(profile as Partial<CharacterProfile>);
      const response = await actor.requestDilemma();

      // Persist
      const state = actor.exportState();
      await updateStudioSession(sessionId, {
        conversation: state.conversation.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
        inferredTraits: state.inferredTraits,
        exploredTopics: Array.from(state.exploredTopics),
      });

      return c.json({
        ok: true,
        response: response.response,
        inferredTraits: response.inferredTraits,
        meta: response.meta,
      });
    } catch (error) {
      console.error('Dilemma generation error:', error);
      return c.json({ ok: false, error: 'Failed to generate dilemma' }, 500);
    }
  });

  // DELETE /studio/session/:id - Delete a session
  app.delete('/studio/session/:id', async (c) => {
    try {
      const sessionId = c.req.param('id');

      // Remove from cache
      const actor = actorCache.get(sessionId);
      if (actor) {
        actor.stop();
        actorCache.delete(sessionId);
      }

      // Remove from database
      const deleted = await deleteStudioSession(sessionId);

      if (!deleted) {
        return c.json({ ok: false, error: 'Session not found' }, 404);
      }

      return c.json({ ok: true });
    } catch (error) {
      console.error('Delete session error:', error);
      return c.json({ ok: false, error: 'Failed to delete session' }, 500);
    }
  });

  // GET /studio/session/:id - Get session state
  app.get('/studio/session/:id', async (c) => {
    try {
      const sessionId = c.req.param('id');
      const session = await getStudioSession(sessionId);

      if (!session) {
        return c.json({ ok: false, error: 'Session not found' }, 404);
      }

      return c.json({
        ok: true,
        session: {
          id: session.id,
          conversation: session.conversation,
          summary: session.summary,
          inferredTraits: session.inferredTraits,
          exploredTopics: session.exploredTopics,
          createdAt: session.createdAt.toISOString(),
          lastActiveAt: session.lastActiveAt.toISOString(),
        },
      });
    } catch (error) {
      console.error('Get session error:', error);
      return c.json({ ok: false, error: 'Failed to get session' }, 500);
    }
  });
}

function getMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error === null || error === undefined) return '';
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return '[unstringifiable error object]';
    }
  }

  if (typeof error === 'number') return String(error);
  if (typeof error === 'boolean') return String(error);
  if (typeof error === 'bigint') return String(error);
  if (typeof error === 'symbol') return error.description ?? '[symbol]';
  if (typeof error === 'function') return '[function error]';

  return '[unknown error]';
}
