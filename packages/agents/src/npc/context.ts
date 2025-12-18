import type { AgentInput } from '../core/types.js';
import type { NpcContextSlice } from './types.js';

/**
 * Extract NPC context from input state slices.
 */
export function extractNpcContext(input: AgentInput): NpcContextSlice | null {
  const slices = input.stateSlices as Record<string, unknown>;
  const npcContext = slices['npcContext'] as NpcContextSlice | undefined;
  return npcContext ?? null;
}
