import { OpenAIProvider, type LLMMessage, type LLMProvider } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import {
  createStudioNpcActor,
  StudioNpcActor,
  DiscoveryGuide,
  TraitInferenceEngine,
  ConversationManager,
  KEEP_RECENT_COUNT,
  buildStudioSystemPrompt,
  type InferredTrait,
  type DiscoveryTopic,
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

const DISCOVERY_TOPICS: DiscoveryTopic[] = [
  'values',
  'fears',
  'relationships',
  'backstory',
  'stress-response',
  'social-behavior',
  'communication-style',
  'goals-motivations',
  'emotional-range',
];

const isDiscoveryTopic = (value: unknown): value is DiscoveryTopic =>
  DISCOVERY_TOPICS.includes(value as DiscoveryTopic);

const normalizeRole = (role: string): 'user' | 'character' | 'system' =>
  role === 'user' || role === 'character' || role === 'system' ? role : 'user';

const normalizeInferredTraits = (
  traits: StudioSession['inferredTraits']
): InferredTrait[] =>
  traits.map((trait) => {
    const evidenceValue = (trait as { evidence?: unknown }).evidence;
    return {
      ...trait,
      evidence: typeof evidenceValue === 'string' ? evidenceValue : '',
    };
  });

const normalizeExploredTopics = (topics: StudioSession['exploredTopics']): DiscoveryTopic[] =>
  topics.filter(isDiscoveryTopic);

interface StudioError {
  ok: false;
  error: string;
  code: 'LLM_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'PARSE_ERROR' | 'CONFIG_ERROR';
  retryable: boolean;
}

export type StudioLlmProvider = LLMProvider;

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
    sessionId: z.string(),
    userMessage: z.string(),
    characterResponse: z.string(),
    profile: z.record(z.string(), z.unknown()),
  });

  const isHttpError = (err: unknown): err is { status: number } => {
    const status = (err as { status?: unknown }).status;
    return typeof status === 'number';
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
  app.get('/studio/generate/stream', (c) => {
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
          const delta = chunk.choices?.[0]?.delta?.content;
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

  // POST /studio/infer-traits - Endpoint to perform trait inference asynchronously
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

      const { sessionId, userMessage, characterResponse, profile } = parsed.data;

      // Initialize engine
      const engine = new TraitInferenceEngine({
        llmProvider: llmProvider,
      });

      // Infer traits from this specific exchange
      const inferredTraits = await engine.inferFromExchange(
        userMessage,
        characterResponse,
        profile as Partial<CharacterProfile>
      );

      // Persist to session
      const session = await getStudioSession(sessionId);
      if (session) {
        const existingTraits = (session.inferredTraits as unknown as InferredTrait[]) || [];
        // Append new traits to the history
        const updatedTraits = [...existingTraits, ...inferredTraits];

        await updateStudioSession(sessionId, {
          inferredTraits: updatedTraits,
        });
      }

      return c.json({ ok: true, inferredTraits });
    } catch (error) {
      console.error('Studio infer-traits error:', getMessage(error));
      return c.json({ ok: false, error: 'Inference failed', inferredTraits: [] }, 500);
    }
  });

  // POST /studio/summarize - Endpoint to summarize older messages
  app.post('/studio/summarize', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = z.object({ sessionId: z.string() }).safeParse(body);

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

      const { sessionId } = parsed.data;
      const session = await getStudioSession(sessionId);

      if (!session) {
        return c.json({ ok: false, error: 'Session not found' } satisfies ApiError, 404);
      }

      // Initialize manager and restore state
      const profileSnapshot = session.profileSnapshot;
      const characterName =
        typeof profileSnapshot['name'] === 'string' ? profileSnapshot['name'] : 'Character';

      const manager = new ConversationManager({
        llmProvider: llmProvider,
        characterName,
      });

      manager.restore({
        messages: session.conversation.map((m, idx) => {
          const role =
            m.role === 'user' || m.role === 'character' || m.role === 'system' ? m.role : 'user';
          return {
            id: `msg-${idx}`,
            content: m.content,
            role,
            timestamp: new Date(m.timestamp),
          };
        }),
        summary: session.summary,
      });

      // Perform summarization
      if (manager.needsSummarization()) {
        await manager.summarize();

        // Get updated state
        const state = manager.export();

        // Keep only recent messages in DB (ConversationManager.summarize doesn't prune its internal list, so we do it here)
        // Keep the last few messages as per KEEP_RECENT_COUNT in ConversationManager
        const recentMessages = state.messages.slice(-KEEP_RECENT_COUNT);

        await updateStudioSession(sessionId, {
          summary: state.summary,
          conversation: recentMessages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
        });

        return c.json({
          ok: true,
          summarized: true,
          summary: state.summary,
          messageCount: recentMessages.length
        });
      }

      return c.json({ ok: true, summarized: false, summary: session.summary });
    } catch (error) {
      console.error('Studio summarize error:', getMessage(error));
      return c.json({ ok: false, error: 'Summarization failed' }, 500);
    }
  });

  // POST /studio/conversation - Main conversation endpoint
  app.post('/studio/conversation', async (c) => {
    const requestStart = performance.now();
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
      let sessionId = parsed.data.sessionId;

      // Get or create session
      const sessionStart = performance.now();
      let session: StudioSession | null = null;
      let actor: StudioNpcActor | undefined;

      if (sessionId) {
        session = await getStudioSession(sessionId);
        actor = actorCache.get(sessionId);
      }
      const sessionMs = performance.now() - sessionStart;

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
              role: normalizeRole(m.role),
              timestamp: new Date(m.timestamp),
              thought: undefined,
            })),
            summary: session.summary,
            inferredTraits: normalizeInferredTraits(session.inferredTraits),
            exploredTopics: normalizeExploredTopics(session.exploredTopics),
          });
        }
      }

      if (!actor || !sessionId) {
        return c.json({ ok: false, error: 'Failed to initialize actor' }, 500);
      }

      // Update profile in actor
      actor.updateProfile(profile as Partial<CharacterProfile>);

      // Send message and get response
      const respondStart = performance.now();
      const response = await actor.respond(message);
      const respondMs = performance.now() - respondStart;

      // Persist updated state
      const persistStart = performance.now();
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
      const persistMs = performance.now() - persistStart;

      const totalMs = performance.now() - requestStart;
      console.log(`[StudioTiming] sessionId=${sessionId} total=${totalMs.toFixed(0)}ms session=${sessionMs.toFixed(0)}ms respond=${respondMs.toFixed(0)}ms persist=${persistMs.toFixed(0)}ms`);

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

  // POST /studio/conversation/stream - Streaming conversation endpoint
  app.post('/studio/conversation/stream', async (c) => {
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
    let sessionId = parsed.data.sessionId;

    // Get or create session
    let session: StudioSession | null = null;
    let actor: StudioNpcActor | undefined;

    if (sessionId) {
      session = await getStudioSession(sessionId);
      actor = actorCache.get(sessionId);
    }

    if (!session) {
      sessionId = crypto.randomUUID();
      session = await createStudioSession(sessionId, profile);
    }

    if (!actor && sessionId) {
      actor = createStudioNpcActor({
        sessionId,
        profile: profile as Partial<CharacterProfile>,
        llmProvider,
      });
      actorCache.set(sessionId, actor);

      if (session.conversation.length > 0) {
        actor.restoreState({
          conversation: session.conversation.map((m, idx) => ({
            id: `msg-${idx}`,
            content: m.content,
            role: normalizeRole(m.role),
            timestamp: new Date(m.timestamp),
            thought: undefined,
          })),
          summary: session.summary,
          inferredTraits: normalizeInferredTraits(session.inferredTraits),
          exploredTopics: normalizeExploredTopics(session.exploredTopics),
        });
      }
    }

    if (!actor || !sessionId) {
      return c.json({ ok: false, error: 'Failed to initialize actor' }, 500);
    }

    actor.updateProfile(profile as Partial<CharacterProfile>);

    return streamSSE(c, async (stream) => {
      let fullResponse = '';

      try {
        // Send session ID first
        await stream.writeSSE({
          event: 'session',
          data: JSON.stringify({ sessionId }),
        });

        // Get current state for context (now properly synced via RESTORE_STATE event)
        const currentState = actor.exportState();

        // Build messages for streaming
        const messages: LLMMessage[] = [
          { role: 'system', content: buildStudioSystemPrompt(profile as Partial<CharacterProfile>, currentState.summary) },
        ];

        // Add context window (existing messages + new user message)
        const contextWindow = currentState.conversation.slice(-19);
        messages.push(...contextWindow.map(m => ({
          role: (m.role === 'character' ? 'assistant' : 'user') as LLMMessage['role'],
          content: m.content,
        })));

        // Add the new user message
        messages.push({ role: 'user', content: message });

        // Stream the response
        const iterable = await runLlmEffect(llmProvider.stream(messages));

        for await (const chunk of iterable) {
          const delta = (chunk as unknown as { choices?: { delta?: { content?: string } }[] })?.choices?.[0]?.delta?.content;
          const content = typeof delta === 'string' ? delta : '';
          if (!content) continue;

          fullResponse += content;
          await stream.writeSSE({
            event: 'content',
            data: JSON.stringify({ content }),
          });
        }

        // Build new conversation array with user message and response
        const now = new Date();
        const newConversation = [
          ...currentState.conversation.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
          { role: 'user' as const, content: message, timestamp: now.toISOString() },
          { role: 'character' as const, content: fullResponse, timestamp: new Date().toISOString() },
        ];

        // Persist state directly
        await updateStudioSession(sessionId, {
          profileSnapshot: profile,
          conversation: newConversation,
          summary: currentState.summary,
          inferredTraits: currentState.inferredTraits,
          exploredTopics: currentState.exploredTopics,
        });

        // Invalidate actor cache so next request gets fresh state
        actorCache.delete(sessionId);

        // Send completion with metadata
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            done: true,
            response: fullResponse,
            inferredTraits: [],
            meta: {
              messageCount: newConversation.length,
              summarized: currentState.summary !== null,
              exploredTopics: currentState.exploredTopics,
            },
          }),
        });
      } catch (err) {
        console.error('Stream conversation error:', getMessage(err));
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'stream_failed', message: getMessage(err) }),
        });
      }
    });
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
          if (isDiscoveryTopic(topic)) {
            guide.markExplored(topic);
          }
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

  // POST /studio/dilemma/generate - Generate just the dilemma scenario (no response)
  app.post('/studio/dilemma/generate', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const profile = (body as { profile?: Partial<CharacterProfile> })?.profile;

      if (!profile) {
        return c.json({ ok: false, error: 'Profile required' }, 400);
      }

      if (!llmProvider) {
        return c.json({ ok: false, error: 'LLM not configured' }, 503);
      }

      // Use the DilemmaEngine to generate just the scenario
      const { DilemmaEngine } = await import('@minimal-rpg/actors');
      const engine = new DilemmaEngine({ llmProvider: llmProvider });
      const dilemma = await engine.generateDilemma(profile);

      return c.json({
        ok: true,
        scenario: dilemma.scenario,
        conflictingValues: dilemma.conflictingValues,
      });
    } catch (error) {
      console.error('Dilemma scenario generation error:', error);
      return c.json({ ok: false, error: 'Failed to generate dilemma scenario' }, 500);
    }
  });

  // POST /studio/dilemma - Generate a moral dilemma (legacy - full flow)
  app.post('/studio/dilemma', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = DilemmaRequestSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' }, 400);
      }

      const { sessionId, profile } = parsed.data;

      console.log('[DilemmaAPI] Request received:', {
        sessionId,
        profileName: profile['name'],
      });

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
            role: normalizeRole(m.role),
            timestamp: new Date(m.timestamp),
          })),
          summary: session.summary,
          inferredTraits: normalizeInferredTraits(session.inferredTraits),
          exploredTopics: normalizeExploredTopics(session.exploredTopics),
        });
      }

      actor.updateProfile(profile as Partial<CharacterProfile>);
      const response = await actor.requestDilemma();

      // Extract the dilemma scenario from conversation (it was added before the response)
      const state = actor.exportState();

      console.log('[DilemmaAPI] Conversation messages:', state.conversation.map(m => ({
        role: m.role,
        contentPreview: m.content.slice(0, 80),
      })));

      // Find the dilemma message - look for [DILEMMA] prefix (with or without colon)
      const dilemmaMessage = state.conversation.find(
        m => m.role === 'system' && m.content.includes('[DILEMMA]')
      );

      // Extract scenario more robustly
      let dilemmaScenario: string | null = null;
      if (dilemmaMessage) {
        // Handle both "[DILEMMA]: scenario" and "[DILEMMA]:scenario" formats
        const regex = /\[DILEMMA\]:\s*(.*)/s;
        const match = regex.exec(dilemmaMessage.content);
        dilemmaScenario = match?.[1]?.trim() ?? null;
      }

      console.log('[DilemmaAPI] Response generated:', {
        foundDilemmaMessage: !!dilemmaMessage,
        dilemmaScenario: dilemmaScenario?.slice(0, 100),
        responseLength: response.response?.length ?? 0,
        responsePreview: response.response?.slice(0, 200),
        hasInferredTraits: response.inferredTraits?.length ?? 0,
      });

      // Persist
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
        dilemmaScenario,
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
