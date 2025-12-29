import { describe, expect, test } from 'vitest';
import {
  createToolBasedTurnHandler,
  type ToolCall,
  type ToolResult,
  type ToolTurnHandlerConfig,
} from '../src/index.js';
import type { AgentStateSlices } from '@minimal-rpg/agents';

function makeToolCall(id: string, args: Record<string, unknown>): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name: 'npc_dialogue',
      arguments: JSON.stringify(args),
    },
  };
}

test('npc_dialogue batches emit execution ordering metadata and merge patches in execution order', async () => {
  const npcToolCalls: ToolCall[] = [
    makeToolCall('call-bg', { npc_id: 'bg', proximity_level: 'far' }),
    makeToolCall('call-direct', { npc_id: 'direct', is_directly_addressed: true }),
  ];

  let llmCallCount = 0;
  const chatWithTools: ToolTurnHandlerConfig['chatWithTools'] = async () => {
    llmCallCount += 1;
    if (llmCallCount === 1) {
      return { tool_calls: npcToolCalls };
    }
    return { message: { role: 'assistant', content: 'done' } };
  };

  const toolExecutor: ToolTurnHandlerConfig['toolExecutor'] = {
    execute: async (toolCall) => {
      if (toolCall.id === 'call-direct') {
        return {
          success: true,
          npc_id: 'direct',
          is_directly_addressed: true,
          statePatches: {
            affinity: [{ op: 'add', path: '/score', value: 'direct-first' }],
          },
        } satisfies ToolResult;
      }
      return {
        success: true,
        npc_id: 'bg',
        proximity_level: 'far',
        statePatches: {
          affinity: [{ op: 'add', path: '/score', value: 'background-second' }],
        },
      } satisfies ToolResult;
    },
  };

  const stateSlices: AgentStateSlices = {
    npc: { name: 'NPC' },
    setting: { name: 'Place' },
    location: { name: 'Place' },
    character: undefined as never,
    inventory: undefined as never,
    time: undefined as never,
  };

  const handler = createToolBasedTurnHandler({
    chatWithTools,
    apiKey: 'test',
    model: 'test-model',
    toolExecutor,
    sessionId: 's1',
    stateSlices,
    proximityState: { engagements: {}, npcProximity: {} } as any,
    currentTurn: 1,
  });

  const result = await handler.handleTurn({
    sessionId: 's1',
    playerInput: 'talk to the crowd',
    baseline: {
      character: {},
      setting: {},
      location: {},
      inventory: {},
      time: {},
    } as any,
  });

  const batchOrdered = result.events.find((e) => e.type === 'npc-dialogue-batch-ordered');
  expect(batchOrdered?.payload.batchId).toBeDefined();
  const batchId = batchOrdered?.payload.batchId as string;
  expect(batchOrdered?.payload.ordering.map((o: any) => o.toolCallId)).toEqual([
    'call-direct',
    'call-bg',
  ]);

  const toolCalled = result.events.filter((e) => e.type === 'tool-called');
  const toolResult = result.events.filter((e) => e.type === 'tool-result');

  expect(toolCalled.map((e) => e.payload.toolCallId)).toEqual(['call-direct', 'call-bg']);
  expect(toolCalled.map((e) => e.payload.executionIndex)).toEqual([0, 1]);
  expect(toolCalled.map((e) => e.payload.originalToolCallIndex)).toEqual([1, 0]);
  expect(toolCalled.every((e) => e.payload.batchId === batchId)).toBe(true);

  expect(toolResult.map((e) => e.payload.toolCallId)).toEqual(['call-direct', 'call-bg']);
  expect(toolResult.map((e) => e.payload.executionIndex)).toEqual([0, 1]);
  expect(toolResult.map((e) => e.payload.originalToolCallIndex)).toEqual([1, 0]);
  expect(toolResult.every((e) => e.payload.batchId === batchId)).toBe(true);

  // State patches are merged in execution order: addressed NPC (executionIndex 0) first.
  expect(result.stateChanges?.patches?.map((p) => p.value)).toEqual([
    'direct-first',
    'background-second',
  ]);
});
