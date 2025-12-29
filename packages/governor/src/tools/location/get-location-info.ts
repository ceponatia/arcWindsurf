/** Get location info tool definition. */
import type { ToolDefinition } from '../types.js';

export const GET_LOCATION_INFO_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_location_info',
    description:
      "Get information about the player's current location or a specified location. Returns description, available exits, who is present, and ambient details.",
    parameters: {
      type: 'object',
      properties: {
        location_id: {
          type: 'string',
          description:
            "Location ID to query. If omitted, returns info about player's current location.",
        },
        include_occupancy: {
          type: 'boolean',
          description: 'Whether to include who is present at the location (default true).',
        },
        include_exits: {
          type: 'boolean',
          description: 'Whether to include available exits (default true).',
        },
      },
      required: [],
    },
  },
};
