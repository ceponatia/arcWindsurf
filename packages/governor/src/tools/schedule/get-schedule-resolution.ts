/** Get schedule resolution tool definition. */
import type { ToolDefinition } from '../types.js';

export const GET_SCHEDULE_RESOLUTION_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_schedule_resolution',
    description:
      "Resolve an NPC's current or planned location and activity based on their schedule. Returns where they should be and what they should be doing at a specific time.",
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
