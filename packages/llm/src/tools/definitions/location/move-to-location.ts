/** Move to location tool definition. */
import type { ToolDefinition } from '../../types.js';

export const MOVE_TO_LOCATION_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'move_to_location',
    description:
      'Move the player to a new location. Use when the player explicitly wants to go somewhere, leave a location, or travel to a destination. Returns the new location details and who is present. Note: This is different from navigate_player which also handles direction-based movement and exit descriptions.',
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
