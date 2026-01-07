/** Use item tool definition (placeholder). */
import type { ToolDefinition } from '../../types.js';

export const USE_ITEM_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'use_item',
    description:
      'Use an item from inventory, optionally on a target. Use this when the player wants to use, apply, or activate an item.',
    parameters: {
      type: 'object',
      properties: {
        item_name: {
          type: 'string',
          description: 'The name of the item to use',
        },
        target: {
          type: 'string',
          description: 'Optional target for the item (person, object, or location)',
        },
        action: {
          type: 'string',
          description: 'Specific action to perform with the item (e.g., "drink", "throw", "read")',
        },
      },
      required: ['item_name'],
    },
  },
};
