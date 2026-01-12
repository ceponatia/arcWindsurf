import { OpenAIProvider, type LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import {
  TRAIT_INFERENCE_SYSTEM_PROMPT,
  buildCharacterSystemPrompt,
  buildTraitInferencePrompt,
} from './studio/prompts.js';
import type { ApiError } from '../types.js';
import { getConfig } from '../utils/config.js';

const cfg = getConfig();

const openrouterApiKey = cfg.openrouterApiKey;
const openrouterModel = cfg.openrouterModel;
const openrouterBaseUrl = 'https://openrouter.ai/api/v1';

const openaiApiKey = process.env['OPENAI_API_KEY'] ?? '';
const openaiModel = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
const openaiBaseUrl = process.env['OPENAI_BASE_URL'];

const llmProvider = openrouterApiKey
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
interface InferredTrait {
  path: string;
  value: unknown;
  confidence: number;
  source: string;
}

interface StudioError {
  ok: false;
  error: string;
  code: 'LLM_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'PARSE_ERROR' | 'CONFIG_ERROR';
  retryable: boolean;
}

export function registerStudioRoutes(app: Hono): void {
  // POST /studio/generate - Generate character response
  app.post('/studio/generate', async (c) => {
    try {
      const body: unknown = await c.req.json();
      const parsed = GenerateRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
      }

      const { userMessage, history } = parsed.data;
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

      const profile = parsed.data.profile as Partial<CharacterProfile>;
      const systemPrompt = buildCharacterSystemPrompt(profile);

      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((entry) => ({
          role: normalizeRole(entry.role),
          content: entry.content,
        })),
        { role: 'user', content: userMessage },
      ];

      try {
        const result = await Effect.runPromise(llmProvider.chat(messages));
        return c.json({ content: result.content ?? '' });
      } catch (error) {
        console.error('Studio generate error:', error);
        const mapped = mapLLMError(error);
        return c.json(mapped.body, mapped.status);
      }
    } catch (error) {
      console.error('Generate endpoint error:', error);
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }
  });

  // GET /studio/generate/stream - Stream character response via SSE
  app.get('/studio/generate/stream', (c) => {
    const profileParam = c.req.query('profile');
    const historyParam = c.req.query('history');
    const userMessage = c.req.query('userMessage') ?? '';

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

    // Basic validation of required params
    if (!profileParam || !historyParam || !userMessage) {
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }

    let profile: Partial<CharacterProfile>;
    let history: { role: string; content: string }[];
    try {
      profile = JSON.parse(profileParam) as Partial<CharacterProfile>;
      history = JSON.parse(historyParam) as { role: string; content: string }[];
    } catch (parseError) {
      console.error('Stream parse error:', parseError);
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }

    const systemPrompt = buildCharacterSystemPrompt(profile);
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((entry) => ({ role: normalizeRole(entry.role), content: entry.content })),
      { role: 'user', content: userMessage },
    ];

    return streamSSE(c, async (stream) => {
      try {
        const result = await Effect.runPromise(llmProvider.stream(messages));
        for await (const chunk of result) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            await stream.writeSSE({ event: 'content', data: JSON.stringify({ content: delta }) });
          }
        }
        await stream.writeSSE({ event: 'done', data: JSON.stringify({ done: true }) });
      } catch (error) {
        console.error('Generate stream error:', error);
        await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'stream_failed' }) });
      }
    });
  });

  // POST /studio/infer-traits - Infer traits from conversation
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

      const { userMessage, characterResponse, currentProfile } = parsed.data;
      const inferencePrompt = buildTraitInferencePrompt(
        userMessage,
        characterResponse,
        currentProfile as Partial<CharacterProfile>
      );

      const messages: LLMMessage[] = [
        { role: 'system', content: TRAIT_INFERENCE_SYSTEM_PROMPT },
        { role: 'user', content: inferencePrompt },
      ];

      try {
        const result = await Effect.runPromise(llmProvider.chat(messages));
        const traits = parseTraitInferenceResponse(result.content);
        return c.json({ traits });
      } catch (error) {
        console.error('Infer traits LLM error:', error);
        const mapped = mapLLMError(error);
        // For inference, on parse or other errors, degrade gracefully to empty array
        if (mapped.body.code === 'PARSE_ERROR') {
          return c.json({ traits: [] });
        }
        return c.json(mapped.body, mapped.status);
      }
    } catch (error) {
      console.error('Infer traits endpoint error:', error);
      return c.json({ ok: false, error: 'Invalid request' } satisfies ApiError, 400);
    }
  });
}

function normalizeRole(role: string): LLMMessage['role'] {
  if (role === 'assistant' || role === 'system' || role === 'tool') {
    return role;
  }
  return 'user';
}

function parseTraitInferenceResponse(content: string | null): InferredTrait[] {
  if (!content) return [];
  try {
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isInferredTrait).filter((trait) => trait.confidence > 0.5);
  } catch {
    return [];
  }
}

function isInferredTrait(value: unknown): value is InferredTrait {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['path'] === 'string' &&
    'value' in record &&
    typeof record['confidence'] === 'number' &&
    typeof record['source'] === 'string'
  );
}

type StudioStatusCode = 200 | 429 | 502 | 504;

function mapLLMError(error: unknown): { status: StudioStatusCode; body: StudioError } {
  if (isRateLimitError(error)) {
    return {
      status: 429,
      body: {
        ok: false,
        error: 'Rate limited, please try again shortly',
        code: 'RATE_LIMITED',
        retryable: true,
      },
    };
  }

  if (isTimeoutError(error)) {
    return {
      status: 504,
      body: {
        ok: false,
        error: 'Request timed out',
        code: 'TIMEOUT',
        retryable: true,
      },
    };
  }

  if (isContentFilteredError(error)) {
    return {
      status: 502,
      body: {
        ok: false,
        error: 'Response blocked by content filters',
        code: 'LLM_UNAVAILABLE',
        retryable: true,
      },
    };
  }

  if (isParseError(error)) {
    return {
      status: 200,
      body: {
        ok: false,
        error: 'Malformed LLM response',
        code: 'PARSE_ERROR',
        retryable: true,
      },
    };
  }

  return {
    status: 502,
    body: {
      ok: false,
      error: 'Failed to reach LLM',
      code: 'LLM_UNAVAILABLE',
      retryable: true,
    },
  };
}

function isRateLimitError(error: unknown): boolean {
  const status = getStatus(error);
  const message = getMessage(error);
  return status === 429 || message.includes('rate limit');
}

function isTimeoutError(error: unknown): boolean {
  const status = getStatus(error);
  const message = getMessage(error);
  return status === 408 || status === 504 || message.includes('timeout');
}

function isContentFilteredError(error: unknown): boolean {
  const message = getMessage(error);
  return message.includes('content') && message.includes('filter');
}

function isParseError(error: unknown): boolean {
  const message = getMessage(error);
  return message.includes('parse');
}

function getStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const maybeStatus = (error as { status?: number }).status;
    if (typeof maybeStatus === 'number') return maybeStatus;
    const responseStatus = (error as { response?: { status?: number } }).response?.status;
    if (typeof responseStatus === 'number') return responseStatus;
  }
  return undefined;
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
