import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/tools/registry.js';
import type { ToolDefinition } from '../src/tools/types.js';

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry();
    const tool: ToolDefinition = {
      type: 'function',
      function: {
        name: 'getData',
        description: 'desc',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    };

    registry.register(tool);

    expect(registry.getTool('getData')).toEqual(tool);
    expect(registry.getAllTools()).toEqual([tool]);
  });

  it('filters tools by names', () => {
    const registry = new ToolRegistry();
    const toolA: ToolDefinition = {
      type: 'function',
      function: {
        name: 'a',
        description: 'a',
        parameters: { type: 'object', properties: {} },
      },
    };
    const toolB: ToolDefinition = {
      type: 'function',
      function: {
        name: 'b',
        description: 'b',
        parameters: { type: 'object', properties: {} },
      },
    };

    registry.register(toolA);
    registry.register(toolB);

    expect(registry.getToolsByNames(['b'])).toEqual([toolB]);
    expect(registry.getToolsByNames(['a', 'missing'])).toEqual([toolA]);
  });
});
