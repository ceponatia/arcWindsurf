/** Examine object tool definition (placeholder). */
import type { ToolDefinition } from '../../types.js';

export const EXAMINE_OBJECT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'examine_object',
    description:
      'Closely examine an object, person, or area for details. Use this when the player wants to inspect, examine, or study something closely.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'What to examine (object, person, or area name)',
        },
        focus: {
          type: 'string',
          description: 'Specific aspect to focus on (e.g., "markings", "condition")',
        },
      },
      required: ['target'],
    },
  },
};
