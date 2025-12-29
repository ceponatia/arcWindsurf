import { describe, expect, test } from 'vitest';
import { orderNpcDialogueBatch } from '../src/tools/npc-dialogue-ordering.js';
import type { ToolCall, ToolResult } from '../src/tools/types.js';

function tc(id: string): ToolCall {
  return {
    id,
    type: 'function',
    function: {
      name: 'npc_dialogue',
      arguments: JSON.stringify({ npc_id: id, player_utterance: 'hello' }),
    },
  };
}

function tr(params: {
  npcId: string;
  isDirect?: boolean;
  proximity?: string;
  priority?: number;
}): ToolResult {
  return {
    success: true,
    npc_id: params.npcId,
    npc_priority: params.priority ?? 0,
    is_directly_addressed: params.isDirect ?? false,
    proximity_level: params.proximity,
  };
}

describe('orderNpcDialogueBatch', () => {
  test('orders by tier: addressed > nearby > background, stable within tiers', () => {
    const items = [
      {
        toolCall: tc('npcA'),
        result: tr({ npcId: 'npcA', isDirect: false, proximity: 'distant' }),
        originalIndex: 0,
      },
      {
        toolCall: tc('npcB'),
        result: tr({ npcId: 'npcB', isDirect: true, proximity: 'distant' }),
        originalIndex: 1,
      },
      {
        toolCall: tc('npcC'),
        result: tr({ npcId: 'npcC', isDirect: false, proximity: 'near' }),
        originalIndex: 2,
      },
      {
        toolCall: tc('npcD'),
        result: tr({ npcId: 'npcD', isDirect: true, proximity: 'close' }),
        originalIndex: 3,
      },
    ];

    const ordered = orderNpcDialogueBatch(items);
    expect(ordered.map((o) => o.npcId)).toEqual(['npcB', 'npcD', 'npcC', 'npcA']);
    expect(ordered.map((o) => o.tier)).toEqual(['addressed', 'addressed', 'nearby', 'background']);
  });

  test('preserves input order inside same tier', () => {
    const items = [
      { toolCall: tc('npc1'), result: tr({ npcId: 'npc1', isDirect: true }), originalIndex: 0 },
      { toolCall: tc('npc2'), result: tr({ npcId: 'npc2', isDirect: true }), originalIndex: 1 },
      { toolCall: tc('npc3'), result: tr({ npcId: 'npc3', isDirect: true }), originalIndex: 2 },
    ];

    const ordered = orderNpcDialogueBatch(items);
    expect(ordered.map((o) => o.npcId)).toEqual(['npc1', 'npc2', 'npc3']);
  });
});
