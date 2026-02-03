/** Update NPC hygiene tool definition. */
import type { ToolDefinition } from '@minimal-rpg/schemas';

export const UPDATE_NPC_HYGIENE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_npc_hygiene',
    description:
      "Update an NPC's hygiene state based on their recent activity. Use this after narrative events that would affect body cleanliness (physical exertion, sweating, environmental exposure, bathing). This affects sensory descriptions.",
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
            "Activity level that affects decay rate. 'idle' (resting), 'walking' (normal movement), 'running' (fast movement/light exercise), 'labor' (physical work), 'combat' (fighting/intense exertion)",
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
            "Current footwear, affects feet hygiene decay. 'barefoot' (minimal decay), 'sandals' (low decay), 'shoes_with_socks' (normal), 'shoes_no_socks' (high), 'boots_heavy' (high), 'boots_sealed' (very high)",
        },
        environment: {
          type: 'string',
          enum: ['dry', 'humid', 'rain', 'swimming'],
          description:
            "Environmental conditions. 'dry' (reduced decay), 'humid' (increased decay), 'rain' (slight cleaning), 'swimming' (full cleaning effect)",
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
