/** Navigation tool definition (placeholder). */
import type { ToolDefinition } from '@minimal-rpg/schemas';

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
