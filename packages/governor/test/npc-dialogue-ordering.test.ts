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

function tierRank(tier: 'addressed' | 'nearby' | 'background'): number {
  switch (tier) {
    case 'addressed':
      return 0;
    case 'nearby':
      return 1;
    case 'background':
      return 2;
  }
}

function tierOf(result: ToolResult): 'addressed' | 'nearby' | 'background' {
  if (result['is_directly_addressed'] === true) return 'addressed';
  const prox = result['proximity_level'];
  if (prox === 'intimate' || prox === 'close' || prox === 'near') return 'nearby';
  return 'background';
}

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
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

  test("does not reorder within 'nearby' tier when proximity_level differs", () => {
    const items = [
      {
        toolCall: tc('npc1'),
        result: tr({ npcId: 'npc1', isDirect: false, proximity: 'intimate' }),
        originalIndex: 0,
      },
      {
        toolCall: tc('npc2'),
        result: tr({ npcId: 'npc2', isDirect: false, proximity: 'close' }),
        originalIndex: 1,
      },
      {
        toolCall: tc('npc3'),
        result: tr({ npcId: 'npc3', isDirect: false, proximity: 'near' }),
        originalIndex: 2,
      },
    ];

    const ordered = orderNpcDialogueBatch(items);
    expect(ordered.map((o) => o.npcId)).toEqual(['npc1', 'npc2', 'npc3']);
    expect(ordered.map((o) => o.tier)).toEqual(['nearby', 'nearby', 'nearby']);
  });

  test('extracts npc_priority but does not use it for sorting', () => {
    const items = [
      {
        toolCall: tc('npc1'),
        result: tr({ npcId: 'npc1', isDirect: true, priority: 999 }),
        originalIndex: 0,
      },
      {
        toolCall: tc('npc2'),
        result: tr({ npcId: 'npc2', isDirect: true, priority: 0 }),
        originalIndex: 1,
      },
      {
        toolCall: tc('npc3'),
        result: tr({ npcId: 'npc3', isDirect: true, priority: -5 }),
        originalIndex: 2,
      },
    ];

    const ordered = orderNpcDialogueBatch(items);
    expect(ordered.map((o) => o.npcId)).toEqual(['npc1', 'npc2', 'npc3']);
    expect(ordered.map((o) => o.npcPriority)).toEqual([999, 0, -5]);
  });

  test('handles an empty batch', () => {
    const ordered = orderNpcDialogueBatch([]);
    expect(ordered).toEqual([]);
  });

  test("treats missing or non-string proximity_level as 'background'", () => {
    const items = [
      {
        toolCall: tc('npc1'),
        result: {
          success: true,
          npc_id: 'npc1',
          is_directly_addressed: false,
        } satisfies ToolResult,
        originalIndex: 0,
      },
      {
        toolCall: tc('npc2'),
        result: { success: true, npc_id: 'npc2', proximity_level: 123 } satisfies ToolResult,
        originalIndex: 1,
      },
      {
        toolCall: tc('npc3'),
        result: tr({ npcId: 'npc3', isDirect: false, proximity: 'near' }),
        originalIndex: 2,
      },
    ];

    const ordered = orderNpcDialogueBatch(items);
    expect(ordered.map((o) => ({ id: o.npcId, tier: o.tier }))).toEqual([
      { id: 'npc3', tier: 'nearby' },
      { id: 'npc1', tier: 'background' },
      { id: 'npc2', tier: 'background' },
    ]);
  });

  test('randomized batches remain tier-ordered and stable within tiers', () => {
    const rng = makeRng(1337);
    const proximityOptions: Array<string | number | undefined> = [
      'intimate',
      'close',
      'near',
      'far',
      'background',
      '',
      undefined,
      123,
    ];

    for (let iteration = 0; iteration < 50; iteration++) {
      const batchSize = 1 + Math.floor(rng() * 12);
      const items = Array.from({ length: batchSize }, (_, i) => {
        const isDirect = rng() < 0.25;
        const proxRaw = proximityOptions[Math.floor(rng() * proximityOptions.length)];
        const result: ToolResult = {
          success: true,
          npc_id: `npc-${iteration}-${i}`,
          is_directly_addressed: isDirect,
          proximity_level: proxRaw as unknown,
        };
        return {
          toolCall: tc(`call-${iteration}-${i}`),
          result,
          originalIndex: i,
        };
      });

      const ordered = orderNpcDialogueBatch(items);

      const expectedIds = [...items]
        .sort((a, b) => {
          const tierCmp = tierRank(tierOf(a.result)) - tierRank(tierOf(b.result));
          if (tierCmp !== 0) return tierCmp;
          return a.originalIndex - b.originalIndex;
        })
        .map((i) => i.toolCall.id);

      expect(ordered.map((o) => o.toolCall.id)).toEqual(expectedIds);
    }
  });
});
