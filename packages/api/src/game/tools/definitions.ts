/**
 * Session-focused tool definitions for LLM function calling.
 *
 * These tools allow the LLM to query session state directly,
 * enabling context-aware responses without manual context injection.
 */
import type { ToolDefinition } from './types.js';

// =============================================================================
// Session State Tools
// =============================================================================

/**
 * Get active session tags - retrieves style/tone modifiers for the session.
 * Allows LLM to adapt behavior based on active style tags.
 */
export const GET_SESSION_TAGS_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_session_tags',
    description:
      'Retrieve the active style tags for the current session. ' +
      'Use this to understand the tone, genre, or style modifiers that should influence your responses.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category to filter tags by (e.g., "tone", "genre", "style")',
        },
      },
      required: [],
    },
  },
};

/**
 * Get session persona - retrieves the player persona context.
 * Allows NPCs to respond with awareness of the player's character.
 */
export const GET_SESSION_PERSONA_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_session_persona',
    description:
      "Retrieve the player's persona/character profile for this session. " +
      'Use this to personalize NPC responses and interactions based on who the player is.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

/**
 * Query NPC list - lists available NPCs in the session.
 * Helps LLM determine valid interaction targets.
 */
export const QUERY_NPC_LIST_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'query_npc_list',
    description:
      'List all NPCs available in the current session. ' +
      'Use this to determine which characters are present and can be interacted with.',
    parameters: {
      type: 'object',
      properties: {
        active_only: {
          type: 'boolean',
          description: 'If true, only return currently active NPCs',
        },
      },
      required: [],
    },
  },
};

/**
 * Get NPC transcript - retrieves conversation history with a specific NPC.
 * Enables character consistency by reviewing past dialogue.
 */
export const GET_NPC_TRANSCRIPT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_npc_transcript',
    description:
      'Retrieve the conversation history with a specific NPC. ' +
      'Use this to maintain character consistency and recall past interactions.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The ID of the NPC to get conversation history for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default: 20)',
        },
      },
      required: ['npc_id'],
    },
  },
};

// =============================================================================
// Tool Collections
// =============================================================================

/** Session state query tools */
export const SESSION_TOOLS: ToolDefinition[] = [
  GET_SESSION_TAGS_TOOL,
  GET_SESSION_PERSONA_TOOL,
  QUERY_NPC_LIST_TOOL,
  GET_NPC_TRANSCRIPT_TOOL,
];

/**
 * Get session tools appropriate for current implementation.
 */
export function getSessionTools(): ToolDefinition[] {
  return SESSION_TOOLS;
}
