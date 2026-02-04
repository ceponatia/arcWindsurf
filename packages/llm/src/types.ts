import { Effect } from 'effect';
import type { ToolCall, ToolDefinition, MessageRole } from '@minimal-rpg/schemas';

export type { MessageRole } from '@minimal-rpg/schemas';

/** LLM Message. */
export interface LLMMessage {
  role: MessageRole;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
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
  tool_calls?: ToolCall[] | null;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

export interface LLMStreamChunk {
  choices: readonly {
    delta?: {
      content?: string | null;
    };
  }[];
}

/** LLM Provider interface. */
export interface LLMProvider {
  readonly id: string;
  readonly supportsTools: boolean;
  readonly supportsFunctions: boolean;

  chat(messages: LLMMessage[], options?: ChatOptions): Effect.Effect<LLMResponse, Error>;
  stream(
    messages: LLMMessage[],
    options?: ChatOptions
  ): Effect.Effect<AsyncIterable<LLMStreamChunk>, Error>;
}

/** Task types for tiered cognition. */
export type LlmCognitionTaskType = 'fast' | 'deep' | 'reasoning' | 'vision';

/** Cognition task request. */
export interface LlmCognitionTask {
  type: LlmCognitionTaskType;
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
