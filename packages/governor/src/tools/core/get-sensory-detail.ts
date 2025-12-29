/** Sensory detail tool definition. */
import type { ToolDefinition } from '../types.js';

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
