import { Effect } from 'effect';
import type { ToolDefinition } from './tools/types.js';

/** LLM Message roles. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** LLM Message. */
export interface LLMMessage {
  role: MessageRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[]; // Simplified for now, will refine
}

/** Chat options. */
export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'json_object' } | { type: 'text' };
}

/** LLM Response. */
export interface LLMResponse {
  id: string;
  content: string | null;
  tool_calls?: any[] | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

/** LLM Provider interface. */
export interface LLMProvider {
  readonly id: string;
  readonly supportsTools: boolean;
  readonly supportsFunctions: boolean;

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error>;
  stream(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<AsyncIterable<any>, Error>;
}

/** Task types for tiered cognition. */
export type CognitionTaskType = 'fast' | 'deep' | 'reasoning' | 'vision';

/** Cognition task request. */
export interface CognitionTask {
  type: CognitionTaskType;
  messages: LLMMessage[];
  options?: ChatOptions;
}

/** Token budget state. */
export interface TokenBudget {
  sessionId: string;
  limit: number;
  used: number;
  remaining: number;
}
