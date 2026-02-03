import { getErrorMessage, isAbortError } from '../errors/errors.js';
import { safeJson, safeText } from '../http/fetch.js';
import type { ToolCall, ToolDefinition } from '@minimal-rpg/schemas';
import type {
  ChatRole,
  LlmGenerationOptions,
  LlmResponse,
  ChatMessageWithTools,
  OpenRouterChatResponse,
  OpenRouterToolResponse,
} from './types.js';
import { buildProviderOptions } from './types.js';

// Chat message (OpenAI-compatible) used when talking to OpenRouter
interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ProviderPreferences {
  order?: string[];
  allow_fallbacks?: boolean;
}

interface ChatWithOpenRouterOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs?: number;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
  provider?: ProviderPreferences;
}

/**
 * Options for tool-calling chat requests.
 */
interface ChatWithToolsOptions {
  apiKey: string;
  model: string;
  messages: ChatMessageWithTools[];
  tools?: ToolDefinition[];
  /** How the model should choose tools: 'auto' | 'none' | 'required' */
  tool_choice?: 'auto' | 'none' | 'required';
  timeoutMs?: number;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OpenRouterResponse {
  id?: string;
  choices?: {
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }[];
  error?: {
    message?: string;
    code?: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * Send a chat completion request to OpenRouter
 */
export async function chatWithOpenRouter(
  opts: ChatWithOpenRouterOptions
): Promise<OpenRouterChatResponse> {
  const { apiKey, model, messages, timeoutMs = 180_000, options = {}, provider } = opts;

  let lastError: string | undefined;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeoutMs);

    try {
      const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

      // Build request body (OpenAI-compatible format)
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: options.temperature,
        top_p: options.top_p,
        max_tokens: options.max_tokens,
      };

      // Add provider routing preferences if specified
      if (provider) {
        body['provider'] = provider;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/ceponatia/rpg-light', // Optional: for rankings
          'X-Title': 'RPG-Light', // Optional: show in OpenRouter dashboard
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await safeText(res);
        const isRetryable = res.status >= 500 || res.status === 429;

        if (isRetryable && attempt < maxRetries) {
          lastError = `OpenRouter error ${res.status}: ${text}`;
          console.warn(`[OpenRouter] Attempt ${attempt + 1} failed (${res.status}), retrying...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { error: `OpenRouter error ${res.status}: ${text}` };
      }

      const payload = (await safeJson<OpenRouterResponse>(res)) ?? {};

      // Extract assistant message from OpenAI-compatible response
      const assistantReply = extractAssistantContent(payload);
      if (assistantReply) {
        return { message: { role: 'assistant', content: assistantReply } };
      }

      // Check for error in response
      if (payload.error) {
        return { error: `OpenRouter API error: ${payload.error.message ?? 'Unknown error'}` };
      }

      return { error: 'Invalid OpenRouter response' };
    } catch (error) {
      if (isAbortError(error)) {
        return { error: `OpenRouter request timed out after ${timeoutMs}ms` };
      }

      const msg = getErrorMessage(error, 'Unknown error');
      if (attempt < maxRetries) {
        lastError = msg;
        console.warn(`[OpenRouter] Attempt ${attempt + 1} failed (${msg}), retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { error: `OpenRouter request failed: ${msg}` };
    } finally {
      clearTimeout(timer);
    }
  }

  return { error: lastError ?? 'OpenRouter request failed after retries' };
}

function extractAssistantContent(payload: OpenRouterResponse | null | undefined): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  // OpenAI-compatible format: choices[0].message.content
  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const choice = payload.choices[0];
    if (choice) {
      const content = choice.message?.content;
      if (typeof content === 'string') {
        return content;
      }
    }
  }

  return null;
}

/**
 * Extract tool calls from OpenRouter response.
 */
function extractToolCalls(payload: OpenRouterResponse | null | undefined): ToolCall[] | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  if (Array.isArray(payload.choices) && payload.choices.length > 0) {
    const choice = payload.choices[0];
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      return choice.message.tool_calls;
    }
  }

  return undefined;
}

/**
 * Send a chat completion request to OpenRouter with tool calling support.
 */
export async function chatWithOpenRouterTools(
  opts: ChatWithToolsOptions
): Promise<OpenRouterToolResponse> {
  const {
    apiKey,
    model,
    messages,
    tools,
    tool_choice = 'auto',
    timeoutMs = 180_000,
    options = {},
  } = opts;

  let lastError: string | undefined;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

      // Build request body with tools
      const body: Record<string, unknown> = {
        model,
        messages,
        temperature: options.temperature,
        top_p: options.top_p,
        max_tokens: options.max_tokens,
      };

      // Only include tools if provided
      if (tools && tools.length > 0) {
        body['tools'] = tools;
        body['tool_choice'] = tool_choice;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/ceponatia/rpg-light',
          'X-Title': 'Minimal-RPG',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await safeText(res);
        const isRetryable = res.status >= 500 || res.status === 429;

        if (isRetryable && attempt < maxRetries) {
          lastError = `OpenRouter error ${res.status}: ${text}`;
          console.warn(
            `[OpenRouter/Tools] Attempt ${attempt + 1} failed (${res.status}), retrying...`
          );
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return { error: `OpenRouter error ${res.status}: ${text}` };
      }

      const payload = (await safeJson<OpenRouterResponse>(res)) ?? {};

      // Check for API error
      if (payload.error) {
        return { error: `OpenRouter API error: ${payload.error.message ?? 'Unknown error'}` };
      }

      // Extract tool calls if present
      const toolCalls = extractToolCalls(payload);
      const finishReason = payload.choices?.[0]?.finish_reason;

      // If we have tool calls, return them (content may be null)
      if (toolCalls && toolCalls.length > 0) {
        const content = payload.choices?.[0]?.message?.content;
        const result: OpenRouterToolResponse = {
          tool_calls: toolCalls,
        };
        if (content) {
          result.message = { role: 'assistant', content };
        }
        if (finishReason) {
          result.finish_reason = finishReason;
        }
        return result;
      }

      // Otherwise, extract content as usual
      const assistantReply = extractAssistantContent(payload);
      if (assistantReply !== null) {
        const result: OpenRouterToolResponse = {
          message: { role: 'assistant', content: assistantReply },
        };
        if (finishReason) {
          result.finish_reason = finishReason;
        }
        return result;
      }

      return { error: 'Invalid OpenRouter response: no content or tool_calls' };
    } catch (error) {
      if (isAbortError(error)) {
        return { error: `OpenRouter request timed out after ${timeoutMs}ms` };
      }

      const msg = getErrorMessage(error, 'Unknown error');
      if (attempt < maxRetries) {
        lastError = msg;
        console.warn(`[OpenRouter/Tools] Attempt ${attempt + 1} failed (${msg}), retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { error: `OpenRouter request failed: ${msg}` };
    } finally {
      clearTimeout(timer);
    }
  }

  return { error: lastError ?? 'OpenRouter request failed after retries' };
}

// Normalized provider generate wrapper implementing LlmResponse shape
export async function generateWithOpenRouter(
  params: {
    apiKey: string;
    model: string;
    messages: { role: ChatRole; content: string }[];
  },
  options?: LlmGenerationOptions
): Promise<LlmResponse | { ok: false; error: string | Record<string, unknown> }> {
  const { apiKey, model, messages } = params;
  const builtOptions = buildProviderOptions(options);
  const result = await chatWithOpenRouter({
    apiKey,
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    ...(Object.keys(builtOptions).length ? { options: builtOptions } : {}),
  });
  if (result.error) {
    return { ok: false, error: result.error };
  }
  return {
    role: 'assistant',
    content: result.message?.content ?? '',
    model,
    createdAt: new Date().toISOString(),
    openrouterMeta: {},
  };
}
