/** Generate NPC schedule tool definition. */
import type { ToolDefinition } from '../types.js';

export const GENERATE_NPC_SCHEDULE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'generate_npc_schedule',
    description:
      "Generate or update an NPC's daily schedule from a template. Maps template placeholders (like $homeLocation, $workLocation) to actual location IDs based on the NPC's profile and available locations.",
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
            "Schedule template ID to use (e.g., 'template-shopkeeper', 'template-guard'). If not provided, a suitable template will be chosen based on NPC occupation.",
        },
        placeholder_mappings: {
          type: 'object',
          description:
            'Map of placeholder names to location IDs (e.g., {"homeLocation": "loc-123", "workLocation": "loc-456"}). If not fully provided, will attempt to infer from NPC profile and available locations.',
        },
      },
      required: ['npc_id'],
    },
  },
};
