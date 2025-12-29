/** Update relationship tool definition. */
import type { ToolDefinition } from '../types.js';

export const UPDATE_RELATIONSHIP_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_relationship',
    description:
      "Update the relationship state between player and NPC. Use after significant interactions that would affect the NPC's opinion. Can use predefined action types (like 'give-gift', 'insult', 'help-requested') or specify direct changes.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose relationship to update',
        },
        action_type: {
          type: 'string',
          description:
            "Predefined action type (e.g., 'give-gift', 'compliment-sincere', 'insult', 'help-requested', 'lie-caught', 'flirt-welcome')",
        },
        delta: {
          type: 'number',
          description:
            'Direct change amount for a specific dimension (-100 to 100). Use with dimension parameter.',
        },
        dimension: {
          type: 'string',
          enum: ['fondness', 'trust', 'respect', 'comfort', 'attraction', 'fear'],
          description: 'Which affinity dimension to modify directly. Use with delta parameter.',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for the relationship change',
        },
        milestone_id: {
          type: 'string',
          description:
            "ID of a milestone to record (for significant events like 'saved-life', 'betrayed', 'first-kiss')",
        },
      },
      required: ['npc_id'],
    },
  },
};
