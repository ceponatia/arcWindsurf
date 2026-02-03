/** Get hygiene sensory modifier tool definition. */
import type { ToolDefinition } from '@minimal-rpg/schemas';

export const GET_HYGIENE_SENSORY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_hygiene_sensory',
    description:
      "Get sensory description modifiers based on an NPC's hygiene state. Use this when generating smell, touch, or taste descriptions to add realism based on accumulated body state.",
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
