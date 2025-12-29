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
 * Order `npc_dialogue` results deterministically.
 *
 * This function is used by the tool-calling turn handler to reorder a contiguous batch of
 * `npc_dialogue` tool calls that were returned by the LLM.
 *
 * Ordering rules:
 * - Tier: `addressed` > `nearby` > `background`
 * - Within a tier: stable by `originalIndex` (the LLM-provided order)
 *
 * Tier classification:
 * - `addressed` when the tool result includes `is_directly_addressed === true`
 * - `nearby` when `proximity_level` is one of: `intimate`, `close`, `near`
 * - Otherwise: `background`
 *
 * Notes:
 * - `npcPriority` is extracted for observability/debugging but is NOT used for sorting.
 * - `proximity_level` is only used to bucket into `nearby` vs `background`. We intentionally
 *   do not sort within `nearby` by proximity (e.g. intimate vs close vs near).
 * - Missing or non-string `proximity_level` is treated as `background`.
 *
 * Downstream implications (important):
 * - The Governor executes the reordered batch and merges state patches in that execution order.
 *   If multiple NPCs touch the same state fields, the final state depends on this ordering.
 */
export function orderNpcDialogueBatch(
  items: NpcDialogueBatchItem[]
): OrderedNpcDialogueBatchItem[] {
  const enriched: OrderedNpcDialogueBatchItem[] = items.map((item) => {
    const npcId = typeof item.result['npc_id'] === 'string' ? item.result['npc_id'] : 'unknown';
    const npcPriorityRaw = item.result['npc_priority'];
    // Note: npcPriority is currently captured for debugging/future use and does not affect sorting.
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
