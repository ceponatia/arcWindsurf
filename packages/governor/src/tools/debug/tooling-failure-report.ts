/** Tooling failure diagnostics tool definition. */
import type { ToolDefinition } from '../types.js';

export const TOOLING_FAILURE_REPORT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'tooling_failure_report',
    description:
      'Report why tool calling failed and provide debugging context as JSON. Use this ONLY when you are unable to call the appropriate game tools.',
    parameters: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'One-line summary of what went wrong',
        },
        stage: {
          type: 'string',
          enum: ['initial', 'retry', 'post_tool'],
          description: 'Where the failure occurred',
        },
        suspected_cause: {
          type: 'string',
          description: 'Your best guess about why tool calling did not occur',
        },
        intended_tool: {
          type: 'string',
          description: 'Which tool you intended to call (if any)',
        },
        invalid_output_excerpt: {
          type: 'string',
          description: 'A short excerpt of the invalid output you produced (if applicable)',
        },
        available_tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'The tool names you believe are available',
        },
        finish_reason: {
          type: 'string',
          description: 'Finish reason reported by the model provider (if known)',
        },
        notes: {
          type: 'string',
          description: 'Optional extra debugging notes',
        },
      },
      required: ['summary', 'stage'],
    },
  },
};
