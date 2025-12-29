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

// =============================================================================
// DEBUG: Tooling Diagnostics
// =============================================================================

/**
 * Tooling failure report tool - emits structured diagnostics when tool-calling fails.
 * This is not a game action; it exists to aid debugging when models output narrative
 * or tool syntax as text instead of producing real tool_calls.
 */
export const TOOLING_FAILURE_REPORT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'tooling_failure_report',
    description:
      'Report why tool calling failed and provide debugging context as JSON. ' +
      'Use this ONLY when you are unable to call the appropriate game tools.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'One-line summary of what went wrong',
        },
        stage: {
          type: 'string',
          enum: ['initial', 'retry', 'post_tool'],
          description: 'Where the failure occurred',
        },
        suspected_cause: {
          type: 'string',
          description: 'Your best guess about why tool calling did not occur',
        },
        intended_tool: {
          type: 'string',
          description: 'Which tool you intended to call (if any)',
        },
        invalid_output_excerpt: {
          type: 'string',
          description: 'A short excerpt of the invalid output you produced (if applicable)',
        },
        available_tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'The tool names you believe are available',
        },
        finish_reason: {
          type: 'string',
          description: 'Finish reason reported by the model provider (if known)',
        },
        notes: {
          type: 'string',
          description: 'Optional extra debugging notes',
        },
      },
      required: ['summary', 'stage'],
    },
  },
};

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

/**
 * Move to location tool - moves player to a new location.
 * Updates player location state and triggers location-change hooks.
 *
 * @see dev-docs/32-npc-encounters-and-occupancy.md
 */
export const MOVE_TO_LOCATION_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'move_to_location',
    description:
      'Move the player to a new location. Use when the player explicitly wants to go somewhere, ' +
      'leave a location, or travel to a destination. Returns the new location details and ' +
      'who is present. Note: This is different from navigate_player which also handles direction-based ' +
      'movement and exit descriptions.',
    parameters: {
      type: 'object',
      properties: {
        destination_id: {
          type: 'string',
          description:
            'The ID of the destination location. Must be a valid location from the setting.',
        },
        destination_name: {
          type: 'string',
          description:
            'Human-readable name of the destination (for narrative purposes, used if ID unknown).',
        },
        travel_mode: {
          type: 'string',
          enum: ['walk', 'run', 'sneak', 'teleport', 'vehicle'],
          description: 'How the player travels to the location. Affects travel time and detection.',
        },
        time_to_arrive: {
          type: 'number',
          description:
            'Optional: minutes to reach destination. If not provided, calculated from distance.',
        },
      },
      required: ['destination_id'],
    },
  },
};

/**
 * Get location info tool - retrieves information about a location.
 * Returns description, exits, occupancy, and ambient details.
 */
export const GET_LOCATION_INFO_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_location_info',
    description:
      "Get information about the player's current location or a specified location. " +
      'Returns description, available exits, who is present, and ambient details.',
    parameters: {
      type: 'object',
      properties: {
        location_id: {
          type: 'string',
          description:
            "Location ID to query. If omitted, returns info about player's current location.",
        },
        include_occupancy: {
          type: 'boolean',
          description: 'Whether to include who is present at the location (default true).',
        },
        include_exits: {
          type: 'boolean',
          description: 'Whether to include available exits (default true).',
        },
      },
      required: [],
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
 * Advance time tool - progresses game time and checks for scheduled events.
 * Handles player-initiated time skips (waiting, sleeping, etc.)
 *
 * @see dev-docs/26-time-system.md
 */
export const ADVANCE_TIME_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'advance_time',
    description:
      'Advance game time by a specified amount. Use when the player wants to wait, ' +
      'sleep, pass time, or when narrative indicates time should pass. Returns the ' +
      'new time state and any events that triggered during the skip.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount of time to advance',
        },
        unit: {
          type: 'string',
          enum: ['turns', 'minutes', 'hours'],
          description: 'Unit of time (turns, minutes, or hours)',
        },
        reason: {
          type: 'string',
          description:
            'Narrative justification for time skip (e.g., "waiting for nightfall", "sleeping")',
        },
        skip_type: {
          type: 'string',
          enum: ['wait', 'sleep', 'activity', 'travel', 'automatic'],
          description:
            'Type of time skip: wait (actively waiting), sleep (resting), activity ' +
            '(doing something that takes time), travel (moving between locations), ' +
            'automatic (system-triggered turn advancement)',
        },
      },
      required: ['amount', 'unit'],
    },
  },
};

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
 * Applies affinity effects based on action types or direct changes.
 *
 * STATUS: IMPLEMENTED - Uses affinity system
 */
export const UPDATE_RELATIONSHIP_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_relationship',
    description:
      "Update the relationship state between player and NPC. Use after significant interactions that would affect the NPC's opinion. " +
      "Can use predefined action types (like 'give-gift', 'insult', 'help-requested') or specify direct changes.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose relationship to update',
        },
        action_type: {
          type: 'string',
          description:
            "Predefined action type (e.g., 'give-gift', 'compliment-sincere', 'insult', 'help-requested', 'lie-caught', 'flirt-welcome')",
        },
        delta: {
          type: 'number',
          description:
            'Direct change amount for a specific dimension (-100 to 100). Use with dimension parameter.',
        },
        dimension: {
          type: 'string',
          enum: ['fondness', 'trust', 'respect', 'comfort', 'attraction', 'fear'],
          description: 'Which affinity dimension to modify directly. Use with delta parameter.',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for the relationship change',
        },
        milestone_id: {
          type: 'string',
          description:
            "ID of a milestone to record (for significant events like 'saved-life', 'betrayed', 'first-kiss')",
        },
      },
      required: ['npc_id'],
    },
  },
};

// =============================================================================
// PRIORITY 6: Hygiene & Sensory System Tools
// =============================================================================

/**
 * Update NPC hygiene tool - tracks hygiene decay for NPCs.
 * Called after activity-based turns to accumulate decay points.
 *
 * STATUS: IMPLEMENTED - Uses hygiene state system
 * @see dev-docs/planning/opus-refactor.md Phase 5
 */
export const UPDATE_NPC_HYGIENE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_npc_hygiene',
    description:
      "Update an NPC's hygiene state based on their recent activity. Use this after " +
      'narrative events that would affect body cleanliness (physical exertion, sweating, ' +
      'environmental exposure, bathing). This affects sensory descriptions.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose hygiene to update',
        },
        activity: {
          type: 'string',
          enum: ['idle', 'walking', 'running', 'labor', 'combat'],
          description:
            "Activity level that affects decay rate. 'idle' (resting), 'walking' (normal movement), " +
            "'running' (fast movement/light exercise), 'labor' (physical work), 'combat' (fighting/intense exertion)",
        },
        turns_elapsed: {
          type: 'number',
          description: 'Number of turns since last hygiene update (default: 1)',
        },
        footwear: {
          type: 'string',
          enum: [
            'barefoot',
            'sandals',
            'shoes_with_socks',
            'shoes_no_socks',
            'boots_heavy',
            'boots_sealed',
          ],
          description:
            "Current footwear, affects feet hygiene decay. 'barefoot' (minimal decay), " +
            "'sandals' (low decay), 'shoes_with_socks' (normal), 'shoes_no_socks' (high), " +
            "'boots_heavy' (high), 'boots_sealed' (very high)",
        },
        environment: {
          type: 'string',
          enum: ['dry', 'humid', 'rain', 'swimming'],
          description:
            "Environmental conditions. 'dry' (reduced decay), 'humid' (increased decay), " +
            "'rain' (slight cleaning), 'swimming' (full cleaning effect)",
        },
        cleaned_parts: {
          type: 'array',
          items: { type: 'string' },
          description:
            "Body parts that were cleaned during this turn (e.g., ['hands', 'face'] if washing)",
        },
      },
      required: ['npc_id', 'activity'],
    },
  },
};

/**
 * Get sensory modifier tool - retrieves hygiene-based sensory description modifiers.
 * Used to enrich sensory descriptions with hygiene state.
 *
 * STATUS: IMPLEMENTED - Uses hygiene state system
 */
export const GET_HYGIENE_SENSORY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_hygiene_sensory',
    description:
      "Get sensory description modifiers based on an NPC's hygiene state. Use this " +
      'when generating smell, touch, or taste descriptions to add realism based on ' +
      'accumulated body state.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC to get hygiene modifiers for',
        },
        body_part: {
          type: 'string',
          description: 'Specific body part (e.g., feet, armpits, hair, torso, neck, hands, legs)',
        },
        sense_type: {
          type: 'string',
          enum: ['smell', 'touch', 'taste'],
          description: 'Type of sensory perception to get modifier for',
        },
      },
      required: ['npc_id', 'body_part', 'sense_type'],
    },
  },
};

// =============================================================================
// PRIORITY 7: Schedule & Location Assignment Tools
// =============================================================================

/**
 * Generate NPC schedule tool - creates a schedule from a template.
 * Uses available locations and NPC profile to resolve placeholders.
 *
 * STATUS: IMPLEMENTED - Uses schedule template system
 * @see dev-docs/planning/opus-refactor.md Phase 6
 */
export const GENERATE_NPC_SCHEDULE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'generate_npc_schedule',
    description:
      "Generate or update an NPC's daily schedule from a template. " +
      'Maps template placeholders (like $homeLocation, $workLocation) to actual ' +
      "location IDs based on the NPC's profile and available locations.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC to generate a schedule for',
        },
        template_id: {
          type: 'string',
          description:
            "Schedule template ID to use (e.g., 'template-shopkeeper', 'template-guard'). " +
            'If not provided, a suitable template will be chosen based on NPC occupation.',
        },
        placeholder_mappings: {
          type: 'object',
          description:
            'Map of placeholder names to location IDs (e.g., {"homeLocation": "loc-123", "workLocation": "loc-456"}). ' +
            'If not fully provided, will attempt to infer from NPC profile and available locations.',
        },
      },
      required: ['npc_id'],
    },
  },
};

/**
 * Assign NPC location tool - assigns an NPC to an appropriate location.
 * Uses NPC profile (occupation, interests) to find best-fit location.
 *
 * STATUS: IMPLEMENTED - Uses location matching
 * @see dev-docs/planning/opus-refactor.md Phase 6
 */
export const ASSIGN_NPC_LOCATION_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'assign_npc_location',
    description:
      'Assign an NPC to an appropriate starting location based on their profile. ' +
      "Analyzes the NPC's occupation and interests to find the best-fit location " +
      'from available options.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC to assign a location to',
        },
        location_type: {
          type: 'string',
          enum: ['home', 'work', 'social', 'any'],
          description:
            "Type of location to assign. 'home' for residential, 'work' for occupational, " +
            "'social' for leisure/public spaces, 'any' for best overall match.",
        },
        available_location_ids: {
          type: 'array',
          items: { type: 'string' },
          description:
            'List of location IDs to consider. If not provided, all session locations will be used.',
        },
      },
      required: ['npc_id'],
    },
  },
};

/**
 * Get schedule resolution tool - resolves current location/activity from schedule.
 * Returns where an NPC should be at a given time.
 *
 * STATUS: IMPLEMENTED - Uses schedule resolution
 */
export const GET_SCHEDULE_RESOLUTION_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_schedule_resolution',
    description:
      "Resolve an NPC's current or planned location and activity based on their schedule. " +
      'Returns where they should be and what they should be doing at a specific time.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC to resolve schedule for',
        },
        hour: {
          type: 'number',
          description:
            'Hour (0-23) to resolve schedule for. If not provided, uses current game time.',
        },
        minute: {
          type: 'number',
          description: 'Minute (0-59) to resolve schedule for. Defaults to 0 if hour provided.',
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

/** Debug-only tools - safe to expose in all phases */
export const DEBUG_TOOLS: ToolDefinition[] = [TOOLING_FAILURE_REPORT_TOOL];

/** Priority 2 tools - implement after core */
export const ENVIRONMENT_TOOLS: ToolDefinition[] = [NAVIGATE_PLAYER_TOOL, EXAMINE_OBJECT_TOOL];

/** Priority 2.5 tools - location movement and info */
export const LOCATION_TOOLS: ToolDefinition[] = [MOVE_TO_LOCATION_TOOL, GET_LOCATION_INFO_TOOL];

/** Priority 3 tools - implement after environment */
export const INVENTORY_TOOLS: ToolDefinition[] = [USE_ITEM_TOOL];

/** Priority 4 tools - time system */
export const TIME_TOOLS: ToolDefinition[] = [ADVANCE_TIME_TOOL];

/** Priority 5 tools - future implementation */
export const RELATIONSHIP_TOOLS: ToolDefinition[] = [GET_NPC_MEMORY_TOOL, UPDATE_RELATIONSHIP_TOOL];

/** Priority 6 tools - hygiene and sensory system */
export const HYGIENE_TOOLS: ToolDefinition[] = [UPDATE_NPC_HYGIENE_TOOL, GET_HYGIENE_SENSORY_TOOL];

/** Priority 7 tools - schedule and location assignment */
export const SCHEDULE_TOOLS: ToolDefinition[] = [
  GENERATE_NPC_SCHEDULE_TOOL,
  ASSIGN_NPC_LOCATION_TOOL,
  GET_SCHEDULE_RESOLUTION_TOOL,
];

/** All game tools - use for full tool-calling mode */
export const ALL_GAME_TOOLS: ToolDefinition[] = [
  ...CORE_TOOLS,
  ...ENVIRONMENT_TOOLS,
  ...LOCATION_TOOLS,
  ...INVENTORY_TOOLS,
  ...TIME_TOOLS,
  ...RELATIONSHIP_TOOLS,
  ...HYGIENE_TOOLS,
  ...SCHEDULE_TOOLS,
  ...DEBUG_TOOLS,
];

/**
 * Get tools appropriate for current implementation phase.
 * Start with CORE_TOOLS, expand as handlers are implemented.
 */
export function getActiveTools(): ToolDefinition[] {
  // Phase 8 implementation: core + time + relationship + location + hygiene tools are active
  return [
    ...CORE_TOOLS,
    ...TIME_TOOLS,
    ...RELATIONSHIP_TOOLS,
    ...LOCATION_TOOLS,
    ...HYGIENE_TOOLS,
    ...DEBUG_TOOLS,
  ];

  // Future: return ALL_GAME_TOOLS when all handlers ready
}
