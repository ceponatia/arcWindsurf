/** Advance time tool definition. */
import type { ToolDefinition } from '../types.js';

export const ADVANCE_TIME_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'advance_time',
    description:
      'Advance game time by a specified amount. Use when the player wants to wait, sleep, pass time, or when narrative indicates time should pass. Returns the new time state and any events that triggered during the skip.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Amount of time to advance',
        },
        unit: {
          type: 'string',
          enum: ['turns', 'minutes', 'hours'],
          description: 'Unit of time (turns, minutes, or hours)',
        },
        reason: {
          type: 'string',
          description:
            'Narrative justification for time skip (e.g., "waiting for nightfall", "sleeping")',
        },
        skip_type: {
          type: 'string',
          enum: ['wait', 'sleep', 'activity', 'travel', 'automatic'],
          description:
            'Type of time skip: wait (actively waiting), sleep (resting), activity (doing something that takes time), travel (moving between locations), automatic (system-triggered turn advancement)',
        },
      },
      required: ['amount', 'unit'],
    },
  },
};
