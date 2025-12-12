/**
 * API-specific LLM tools.
 *
 * Session-focused tools for querying session state during LLM interactions.
 * These tools complement the game action tools in @minimal-rpg/governor.
 */

// Types
export type {
  ToolDefinition,
  ToolParameterSchema,
  ToolCall,
  ToolResult,
  StatePatches,
  ChatMessageWithTools,
  // Session tool argument types
  GetSessionTagsArgs,
  GetSessionPersonaArgs,
  QueryNpcListArgs,
  GetNpcTranscriptArgs,
  // Session tool result types
  SessionTagInfo,
  GetSessionTagsResult,
  SessionPersonaInfo,
  GetSessionPersonaResult,
  SessionNpcInfo,
  QueryNpcListResult,
  NpcTranscriptMessage,
  GetNpcTranscriptResult,
  SessionToolResult,
} from './types.js';

// Tool definitions
export {
  GET_SESSION_TAGS_TOOL,
  GET_SESSION_PERSONA_TOOL,
  QUERY_NPC_LIST_TOOL,
  GET_NPC_TRANSCRIPT_TOOL,
  SESSION_TOOLS,
  getSessionTools,
} from './definitions.js';

// Tool handlers
export {
  SessionToolHandler,
  createSessionToolHandler,
  type SessionToolHandlerConfig,
} from './handlers.js';
