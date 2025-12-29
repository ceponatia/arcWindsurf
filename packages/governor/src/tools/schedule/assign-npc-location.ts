/** Assign NPC location tool definition. */
import type { ToolDefinition } from '../types.js';

export const ASSIGN_NPC_LOCATION_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'assign_npc_location',
    description:
      "Assign an NPC to an appropriate starting location based on their profile. Analyzes the NPC's occupation and interests to find the best-fit location from available options.",
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
            "Type of location to assign. 'home' for residential, 'work' for occupational, 'social' for leisure/public spaces, 'any' for best overall match.",
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
