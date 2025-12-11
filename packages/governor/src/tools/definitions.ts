/**
 * Tool definitions for LLM function calling.
 *
 * Defines tools that map to game actions. The LLM can call these tools
 * to retrieve structured data, which it then weaves into narrative.
 */
import type { ToolDefinition } from './types.js';

// =============================================================================
// PRIORITY 1: Core Tools (Implement First)
// =============================================================================

/**
 * Sensory detail tool - retrieves character/object sensory data.
 * Wraps SensoryAgent to return structured data for LLM narrative synthesis.
 */
export const GET_SENSORY_DETAIL_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_sensory_detail',
    description:
      'Retrieve sensory information about a target. Use this when the player wants to smell, touch, taste, look at, or listen to something or someone.',
    parameters: {
      type: 'object',
      properties: {
        sense_type: {
          type: 'string',
          enum: ['smell', 'touch', 'taste', 'look', 'listen'],
          description: 'The type of sensory perception',
        },
        target: {
          type: 'string',
          description: 'What or who the player is sensing (character name or object)',
        },
        body_part: {
          type: 'string',
          description:
            'Specific body part if targeting a character (e.g., hair, feet, hands, face)',
        },
      },
      required: ['sense_type', 'target'],
    },
  },
};

/**
 * NPC dialogue tool - generates NPC response context.
 * Wraps NpcAgent to provide character state for LLM narrative synthesis.
 */
export const NPC_DIALOGUE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'npc_dialogue',
    description:
      'Generate NPC dialogue in response to player speech or action. Use this when the player talks to, interacts with, or addresses an NPC.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The ID or name of the NPC to interact with',
        },
        player_utterance: {
          type: 'string',
          description: 'What the player said or did',
        },
        interaction_type: {
          type: 'string',
          enum: ['speech', 'action', 'emote', 'thought'],
          description: 'The type of player interaction',
        },
        tone: {
          type: 'string',
          enum: ['friendly', 'hostile', 'neutral', 'flirty', 'formal', 'playful'],
          description: 'The emotional tone of the interaction',
        },
      },
      required: ['npc_id', 'player_utterance'],
    },
  },
};

/**
 * Proximity update tool - manages player-NPC sensory engagement state.
 * Updates proximity tracking for continuous sensory narrative.
 */
export const UPDATE_PROXIMITY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_proximity',
    description:
      'Update the proximity/engagement state between player and an NPC body part. ' +
      'Use this to track ongoing sensory contact (e.g., when player starts or stops ' +
      'smelling, touching, or looking at a specific body part).',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC identifier',
        },
        body_part: {
          type: 'string',
          description: 'The body part involved (e.g., hair, feet, hands)',
        },
        sense_type: {
          type: 'string',
          enum: ['look', 'touch', 'smell', 'taste', 'hear'],
          description: 'The sense being engaged',
        },
        action: {
          type: 'string',
          enum: ['engage', 'intensify', 'reduce', 'end'],
          description:
            'What change to make: engage (start new), intensify (increase), reduce (decrease), end (remove)',
        },
        new_intensity: {
          type: 'string',
          enum: ['casual', 'focused', 'intimate'],
          description:
            'New intensity level (required for engage/intensify/reduce, optional for end)',
        },
      },
      required: ['npc_id', 'body_part', 'sense_type', 'action'],
    },
  },
};

// =============================================================================
// PRIORITY 2: Navigation & Environment (Implement Later)
// =============================================================================

/**
 * Navigation tool - moves player or describes available exits.
 * Will wrap MapAgent for location state management.
 *
 * STATUS: PLACEHOLDER - Not yet implemented
 */
export const NAVIGATE_PLAYER_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'navigate_player',
    description:
      'Move the player to a new location or describe available exits. Use this when the player wants to move, go somewhere, or asks about exits/directions.',
    parameters: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['north', 'south', 'east', 'west', 'up', 'down'],
          description: 'The direction to move',
        },
        destination: {
          type: 'string',
          description: 'Named destination (e.g., "the kitchen", "outside")',
        },
        describe_only: {
          type: 'boolean',
          description: 'If true, just describe exits without moving',
        },
      },
      required: [],
    },
  },
};

/**
 * Examine object tool - provides detailed inspection of objects/areas.
 * Will provide rich descriptions from location/object data.
 *
 * STATUS: PLACEHOLDER - Not yet implemented
 */
export const EXAMINE_OBJECT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'examine_object',
    description:
      'Closely examine an object, person, or area for details. Use this when the player wants to inspect, examine, or study something closely.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'What to examine (object, person, or area name)',
        },
        focus: {
          type: 'string',
          description: 'Specific aspect to focus on (e.g., "markings", "condition")',
        },
      },
      required: ['target'],
    },
  },
};

// =============================================================================
// PRIORITY 3: Inventory & Items (Implement Later)
// =============================================================================

/**
 * Use item tool - applies inventory items to targets.
 * Will integrate with inventory state management.
 *
 * STATUS: PLACEHOLDER - Not yet implemented
 */
export const USE_ITEM_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'use_item',
    description:
      'Use an item from inventory, optionally on a target. Use this when the player wants to use, apply, or activate an item.',
    parameters: {
      type: 'object',
      properties: {
        item_name: {
          type: 'string',
          description: 'The name of the item to use',
        },
        target: {
          type: 'string',
          description: 'Optional target for the item (person, object, or location)',
        },
        action: {
          type: 'string',
          description: 'Specific action to perform with the item (e.g., "drink", "throw", "read")',
        },
      },
      required: ['item_name'],
    },
  },
};

// =============================================================================
// PRIORITY 4: Future Tools (Design Only)
// =============================================================================

/**
 * Get NPC memory tool - retrieves NPC's memories of the player.
 * Will query relationship/memory storage.
 *
 * STATUS: DESIGN ONLY - Schema defined, not implemented
 */
export const GET_NPC_MEMORY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_npc_memory',
    description:
      "Retrieve an NPC's memories and impressions of the player. Use when NPC behavior should reflect past interactions.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose memories to query',
        },
        memory_type: {
          type: 'string',
          enum: ['recent', 'significant', 'emotional', 'all'],
          description: 'Type of memories to retrieve',
        },
        topic: {
          type: 'string',
          description: 'Optional topic to filter memories',
        },
      },
      required: ['npc_id'],
    },
  },
};

/**
 * Update relationship tool - modifies NPC relationship state.
 * Will update relationship scores and flags.
 *
 * STATUS: DESIGN ONLY - Schema defined, not implemented
 */
export const UPDATE_RELATIONSHIP_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_relationship',
    description:
      "Update the relationship state between player and NPC. Use after significant interactions that would affect the NPC's opinion.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose relationship to update',
        },
        delta: {
          type: 'number',
          description: 'Change in relationship score (-1.0 to 1.0)',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for the change',
        },
        flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Relationship flags to set (e.g., "first_kiss", "betrayed")',
        },
      },
      required: ['npc_id'],
    },
  },
};

// =============================================================================
// Tool Collections
// =============================================================================

/** Priority 1 tools - implement first */
export const CORE_TOOLS: ToolDefinition[] = [
  GET_SENSORY_DETAIL_TOOL,
  NPC_DIALOGUE_TOOL,
  UPDATE_PROXIMITY_TOOL,
];

/** Priority 2 tools - implement after core */
export const ENVIRONMENT_TOOLS: ToolDefinition[] = [NAVIGATE_PLAYER_TOOL, EXAMINE_OBJECT_TOOL];

/** Priority 3 tools - implement after environment */
export const INVENTORY_TOOLS: ToolDefinition[] = [USE_ITEM_TOOL];

/** Priority 4 tools - future implementation */
export const RELATIONSHIP_TOOLS: ToolDefinition[] = [GET_NPC_MEMORY_TOOL, UPDATE_RELATIONSHIP_TOOL];

/** All game tools - use for full tool-calling mode */
export const ALL_GAME_TOOLS: ToolDefinition[] = [
  ...CORE_TOOLS,
  ...ENVIRONMENT_TOOLS,
  ...INVENTORY_TOOLS,
  ...RELATIONSHIP_TOOLS,
];

/**
 * Get tools appropriate for current implementation phase.
 * Start with CORE_TOOLS, expand as handlers are implemented.
 */
export function getActiveTools(): ToolDefinition[] {
  // Phase 2 implementation: only core tools are active
  return CORE_TOOLS;

  // Future: return ALL_GAME_TOOLS when all handlers ready
}
