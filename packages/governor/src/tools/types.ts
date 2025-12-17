/**
 * Tool-related types for LLM function calling.
 *
 * These types are duplicated from api/types.ts to avoid circular dependencies
 * between governor and api packages. Keep in sync with api/types.ts.
 */
import type { Operation } from 'fast-json-patch';

// =============================================================================
// Tool Definition Types (for defining tools)
// =============================================================================

/**
 * JSON Schema for tool parameters.
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
 * OpenAI-compatible tool definition for function calling.
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
// Tool Call Types (from LLM responses)
// =============================================================================

/**
 * A tool call requested by the LLM.
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// =============================================================================
// Tool Result Types (from tool execution)
// =============================================================================

/**
 * State patches organized by slice key.
 * Key is slice name (e.g., 'proximity', 'inventory'), value is JSON Patch operations.
 */
export type StatePatches = Record<string, Operation[]>;

/**
 * Result from executing a tool call.
 * Always includes success status; additional properties depend on tool.
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
// Chat Message Types (for tool calling)
// =============================================================================

export type ChatRole = 'system' | 'user' | 'assistant';

/** Extended chat role including tool messages (for tool calling) */
export type ChatRoleWithTools = ChatRole | 'tool';

/**
 * Chat message that may include tool calls or tool results.
 */
export interface ChatMessageWithTools {
  role: ChatRoleWithTools;
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// =============================================================================
// OpenRouter Response Types (for tool calling)
// =============================================================================

/**
 * Response from OpenRouter chat with tool calling support.
 */
export interface OpenRouterToolResponse {
  message?: { role: 'assistant'; content: string };
  error?: string;
  tool_calls?: ToolCall[];
  finish_reason?: string;
}
