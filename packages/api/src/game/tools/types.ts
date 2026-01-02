/**
 * API-specific tool types.
 *
 * Re-exports shared types from governor and defines API-specific extensions.
 */

// Re-export shared tool types from governor (canonical source)
export type {
  ToolDefinition,
  ToolParameterSchema,
  ToolCall,
  ToolResult,
  StatePatches,
  ChatMessageWithTools,
} from '@minimal-rpg/utils';

// =============================================================================
// Session Tool Argument Types
// =============================================================================

/** Arguments for get_session_tags tool */
export interface GetSessionTagsArgs {
  /** Optional: filter by tag category */
  category?: string;
}

/** Arguments for get_session_persona tool - no arguments needed */
export type GetSessionPersonaArgs = Record<string, never>;

/** Arguments for query_npc_list tool */
export interface QueryNpcListArgs {
  /** Optional: filter by active/inactive status */
  active_only?: boolean;
}

/** Arguments for get_npc_transcript tool */
export interface GetNpcTranscriptArgs {
  /** The NPC ID to get transcript for */
  npc_id: string;
  /** Maximum number of messages to return (default: 20) */
  limit?: number;
}

// =============================================================================
// Session Tool Result Types
// =============================================================================

/** Base interface for successful tool results with index signature for ToolResult compatibility */
interface SuccessResultBase {
  success: true;
  [key: string]: unknown;
}

/** Tag info returned by get_session_tags */
export interface SessionTagInfo {
  id: string;
  name: string;
  promptText: string;
  category?: string;
}

/** Result from get_session_tags tool */
export interface GetSessionTagsResult extends SuccessResultBase {
  success: true;
  tags: SessionTagInfo[];
  count: number;
}

/** Persona info returned by get_session_persona */
export interface SessionPersonaInfo {
  id: string;
  name: string;
  description?: string;
  attributes?: Record<string, unknown>;
}

/** Result from get_session_persona tool */
export interface GetSessionPersonaResult extends SuccessResultBase {
  success: true;
  persona: SessionPersonaInfo | null;
  has_persona: boolean;
}

/** NPC info returned by query_npc_list */
export interface SessionNpcInfo {
  id: string;
  name: string;
  template_id: string;
  is_active: boolean;
}

/** Result from query_npc_list tool */
export interface QueryNpcListResult extends SuccessResultBase {
  success: true;
  npcs: SessionNpcInfo[];
  count: number;
}

/** Message in NPC transcript */
export interface NpcTranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

/** Result from get_npc_transcript tool */
export interface GetNpcTranscriptResult extends SuccessResultBase {
  success: true;
  npc_id: string;
  npc_name?: string;
  messages: NpcTranscriptMessage[];
  count: number;
}

/** Union of all session tool results */
export type SessionToolResult =
  | GetSessionTagsResult
  | GetSessionPersonaResult
  | QueryNpcListResult
  | GetNpcTranscriptResult;
