/**
 * Tool-related types for LLM function calling.
 */

/**
 * JSON Schema for tool parameters.
 */
export interface ToolParameterSchema {
  [key: string]: unknown;
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

/**
 * Result from executing a tool call.
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  hint?: string;
  [key: string]: unknown;
}
