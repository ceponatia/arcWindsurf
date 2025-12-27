import type { ChatRole, ApiError } from '../types.js';

// LLM chat roles
/** Extended chat role including tool messages (for tool calling) */
export type ChatRoleWithTools = ChatRole | 'tool';

// =============================================================================
// Tool Calling Types (OpenAI-compatible)
// =============================================================================

/**
 * JSON Schema subset for tool parameter definitions.
 */
export interface ToolParameterSchema {
  type: 'object';
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      items?: { type: string };
    }
  >;
  required?: string[];
}

/**
 * Tool definition for LLM function calling.
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolParameterSchema;
  };
}

/**
 * A tool call request from the LLM.
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    /** JSON-encoded arguments */
    arguments: string;
  };
}

/**
 * Chat message with tool calling support.
 */
export interface ChatMessageWithTools {
  role: ChatRoleWithTools;
  content?: string | null;
  /** Tool calls requested by the assistant */
  tool_calls?: ToolCall[];
  /** ID of the tool call this message responds to (role=tool) */
  tool_call_id?: string;
  /** Tool function name (role=tool) */
  name?: string;
}

/**
 * Result from executing a tool.
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  hint?: string;
  [key: string]: unknown;
}

// LLM generation options (provider-agnostic)
export interface LlmGenerationOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  timeoutMs?: number;
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// Normalized LLM response
export interface LlmResponse {
  id?: string;
  role: ChatRole;
  content: string;
  model: string;
  createdAt: string;
  usage?: LlmUsage;
  openrouterMeta?: Record<string, unknown>;
  ollamaMeta?: Record<string, unknown>;
  toolsMeta?: Record<string, unknown>;
  embeddingVector?: number[];
}

// Provider interface
export interface LlmProvider {
  generate(
    messages: { role: ChatRole; content: string }[],
    model: string,
    options?: LlmGenerationOptions
  ): Promise<LlmResponse | ApiError>;
}

export type GenerateWithOpenRouterFn = (
  params: { apiKey: string; model: string; messages: { role: ChatRole; content: string }[] },
  options?: LlmGenerationOptions
) => Promise<LlmResponse | ApiError>;

// =============================================================================
// Provider Utilities
// =============================================================================

/**
 * Build provider options object, excluding undefined values.
 * This ensures we only send non-undefined values to the LLM provider.
 */
export function buildProviderOptions(opts?: LlmGenerationOptions): {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
} {
  if (!opts) return {};
  const out: { temperature?: number; top_p?: number; max_tokens?: number } = {};
  if (opts.temperature !== undefined) out.temperature = opts.temperature;
  if (opts.top_p !== undefined) out.top_p = opts.top_p;
  if (opts.max_tokens !== undefined) out.max_tokens = opts.max_tokens;
  return out;
}
