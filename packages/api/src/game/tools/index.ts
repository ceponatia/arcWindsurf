/**
 * API-specific LLM tools.
 *
 * Session-focused tools for querying session state during LLM interactions.
 * These tools complement the World Bus actor pipeline.
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
  // Gameplay tool argument types
  ExamineObjectArgs,
  NavigatePlayerArgs,
  UseItemArgs,
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
  // Gameplay tool result types
  ExamineObjectResult,
  NavigatePlayerResult,
  UseItemResult,
  GameplayToolResult,
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
