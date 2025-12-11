import { getErrorMessage, safeJson, safeText } from '@minimal-rpg/utils';
import type { ApiError, ChatRole } from '../types.js';
import type { LlmGenerationOptions, LlmResponse } from './types.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatResponse {
  message?: { role: 'assistant'; content: string };
  error?: string;
}

interface ChatWithOllamaOptions {
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  timeoutMs?: number;
  options?: { temperature?: number; top_p?: number; max_tokens?: number };
}

interface OllamaMessagePayload {
  message?: { role?: string; content?: unknown };
  response?: unknown;
}

export async function chatWithOllama(opts: ChatWithOllamaOptions): Promise<OllamaChatResponse> {
  const { baseUrl, model, messages, timeoutMs = 60_000, options = {} } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const endpoint = `${trimTrailingSlash(baseUrl)}/api/chat`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await safeText(res);
      return { error: `Ollama error ${res.status}: ${text}` };
    }
    const payload = await safeJson<OllamaMessagePayload>(res);
    const assistantReply = extractAssistantContent(payload);
    if (assistantReply) {
      return { message: { role: 'assistant', content: assistantReply } };
    }
    return { error: 'Invalid Ollama response' };
  } catch (error) {
    const msg = getErrorMessage(error, 'Unknown error');
    return { error: `Ollama request failed: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function extractAssistantContent(payload: OllamaMessagePayload | null): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const messageContent = payload.message?.content;
  if (typeof messageContent === 'string') {
    return messageContent;
  }
  if (typeof payload.response === 'string') {
    return payload.response;
  }
  return null;
}

// Normalized provider generate wrapper implementing LlmResponse shape
export async function generateWithOllama(
  params: {
    baseUrl: string;
    model: string;
    messages: { role: ChatRole; content: string }[];
  },
  options?: LlmGenerationOptions
): Promise<LlmResponse | ApiError> {
  const { baseUrl, model, messages } = params;
  const builtOptions = {
    ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options?.top_p !== undefined ? { top_p: options.top_p } : {}),
    ...(options?.max_tokens !== undefined ? { max_tokens: options.max_tokens } : {}),
  };
  const result = await chatWithOllama({
    baseUrl,
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
    ollamaMeta: {},
  };
}
