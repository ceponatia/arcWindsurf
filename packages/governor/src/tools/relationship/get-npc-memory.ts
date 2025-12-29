/** Get NPC memory tool definition (design only). */
import type { ToolDefinition } from '../types.js';

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
