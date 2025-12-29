import type { ToolCall, ToolResult } from './types.js';

export type NpcDialogueTier = 'addressed' | 'nearby' | 'background';

export interface NpcDialogueBatchItem {
  toolCall: ToolCall;
  result: ToolResult;
  originalIndex: number;
}

export interface OrderedNpcDialogueBatchItem extends NpcDialogueBatchItem {
  tier: NpcDialogueTier;
  npcId: string;
  npcPriority: number;
}

function getTier(result: ToolResult): NpcDialogueTier {
  const isDirect = result['is_directly_addressed'] === true;
  if (isDirect) return 'addressed';

  const proximity =
    typeof result['proximity_level'] === 'string' ? result['proximity_level'] : undefined;
  if (proximity === 'intimate' || proximity === 'close' || proximity === 'near') {
    return 'nearby';
  }

  return 'background';
}

function tierRank(tier: NpcDialogueTier): number {
  switch (tier) {
    case 'addressed':
      return 0;
    case 'nearby':
      return 1;
    case 'background':
      return 2;
  }
}

/**
 * Order npc_dialogue results deterministically.
 *
 * Rules:
 * - tier: addressed > nearby > background
 * - within tier: preserve original input order
 */
export function orderNpcDialogueBatch(
  items: NpcDialogueBatchItem[]
): OrderedNpcDialogueBatchItem[] {
  const enriched: OrderedNpcDialogueBatchItem[] = items.map((item) => {
    const npcId = typeof item.result['npc_id'] === 'string' ? item.result['npc_id'] : 'unknown';
    const npcPriorityRaw = item.result['npc_priority'];
    const npcPriority =
      typeof npcPriorityRaw === 'number' && Number.isFinite(npcPriorityRaw) ? npcPriorityRaw : 0;
    const tier = getTier(item.result);

    return {
      ...item,
      npcId,
      npcPriority,
      tier,
    };
  });

  return enriched.sort((a, b) => {
    const tierCmp = tierRank(a.tier) - tierRank(b.tier);
    if (tierCmp !== 0) return tierCmp;
    return a.originalIndex - b.originalIndex;
  });
}
