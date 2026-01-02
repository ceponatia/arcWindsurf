/**
 * Shared LLM types and interfaces.
 */
import type { Operation } from 'fast-json-patch';

// =============================================================================
// Chat Roles
// =============================================================================

export type ChatRole = 'system' | 'user' | 'assistant';

/** Extended chat role including tool messages (for tool calling) */
export type ChatRoleWithTools = ChatRole | 'tool';

// =============================================================================
// Tool Definition Types
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

// =============================================================================
// Tool Call Types
// =============================================================================

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

// =============================================================================
// Tool Result Types
// =============================================================================

/**
 * State patches organized by slice key.
 * Key is slice name (e.g., 'proximity', 'inventory'), value is JSON Patch operations.
 */
export type StatePatches = Record<string, Operation[]>;

/**
 * Result from executing a tool.
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  hint?: string;
  /** Optional state patches to apply after tool execution */
  statePatches?: StatePatches;
  [key: string]: unknown;
}

// =============================================================================
// LLM Response Types
// =============================================================================

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
  ): Promise<LlmResponse | { ok: false; error: string | Record<string, unknown> }>;
}

// =============================================================================
// OpenRouter Specific Types
// =============================================================================

export interface OpenRouterChatResponse {
  message?: { role: 'assistant'; content: string };
  error?: string;
}

export interface OpenRouterToolResponse extends OpenRouterChatResponse {
  tool_calls?: ToolCall[];
  finish_reason?: string;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Build provider options object, excluding undefined values.
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
