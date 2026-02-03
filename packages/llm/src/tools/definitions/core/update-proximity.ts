/** Proximity update tool definition. */
import type { ToolDefinition } from '@minimal-rpg/schemas';

export const UPDATE_PROXIMITY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_proximity',
    description:
      'Update the proximity/engagement state between player and an NPC body part. Use this to track ongoing sensory contact (e.g., when player starts or stops smelling, touching, or looking at a specific body part).',
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
