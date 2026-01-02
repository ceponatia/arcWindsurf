/**
 * Prompt Tag Routing
 *
 * Routes enabled session tag bindings into per-turn buckets (session, per-NPC, per-location).
 *
 * MVP rule: NPC-scoped tags only apply to NPCs co-located with the player.
 */

import type { TurnTagContext, TagInstruction } from '@minimal-rpg/governor';

export interface TagBindingWithDefinition {
  id: string;
  tag_id: string;
  target_type: string;
  target_entity_id: string | null;
  tag: {
    id: string;
    name: string;
    prompt_text: string;
    short_description?: string | null;
    activation_mode?: string;
  };
}

export interface BuildTurnTagContextInput {
  bindings: TagBindingWithDefinition[];
  playerLocationId?: string;
  npcLocationById: Map<string, string | undefined>;
}

function renderInstructionText(binding: TagBindingWithDefinition): string {
  // Structured parsing will replace this later; for MVP, use raw prompt text.
  return binding.tag.prompt_text;
}

function makeInstruction(binding: TagBindingWithDefinition): TagInstruction {
  const base: TagInstruction = {
    bindingId: binding.id,
    tagId: binding.tag_id,
    tagName: binding.tag.name,
    targetType: binding.target_type,
    instructionText: renderInstructionText(binding),
  };

  return {
    ...base,
    ...(binding.tag.short_description ? { shortDescription: binding.tag.short_description } : {}),
    ...(binding.tag.activation_mode ? { activationMode: binding.tag.activation_mode } : {}),
  };
}

export function buildTurnTagContext(input: BuildTurnTagContextInput): TurnTagContext {
  const session: TagInstruction[] = [];
  const byNpcInstanceId: Record<string, TagInstruction[]> = {};
  const byLocationId: Record<string, TagInstruction[]> = {};
  const ignored: TurnTagContext['ignored'] = [];

  const playerLocationId = input.playerLocationId;

  // Determine active NPCs based on co-location with player.
  const activeNpcIds = new Set<string>();
  if (playerLocationId) {
    for (const [npcId, npcLocationId] of input.npcLocationById.entries()) {
      if (npcLocationId && npcLocationId === playerLocationId) {
        activeNpcIds.add(npcId);
      }
    }
  } else {
    // If we cannot determine player location, treat all NPCs as active to avoid silently
    // dropping NPC-scoped tags. (This should be rare in production; we log via ignored.)
    for (const npcId of input.npcLocationById.keys()) {
      activeNpcIds.add(npcId);
    }
  }

  const ensureNpcBucket = (npcId: string): TagInstruction[] => {
    byNpcInstanceId[npcId] ??= [];
    return byNpcInstanceId[npcId];
  };

  const ensureLocationBucket = (locationId: string): TagInstruction[] => {
    byLocationId[locationId] ??= [];
    return byLocationId[locationId];
  };

  for (const binding of input.bindings) {
    const instruction = makeInstruction(binding);

    switch (binding.target_type) {
      case 'session': {
        session.push(instruction);
        break;
      }

      case 'npc': {
        // Applies to all active NPCs.
        for (const npcId of activeNpcIds) {
          ensureNpcBucket(npcId).push(instruction);
        }
        break;
      }

      case 'character': {
        const npcId = binding.target_entity_id;
        if (!npcId) {
          ignored.push({
            bindingId: binding.id,
            tagId: binding.tag_id,
            reason: 'character target missing target_entity_id',
          });
          break;
        }
        if (!activeNpcIds.has(npcId)) {
          ignored.push({
            bindingId: binding.id,
            tagId: binding.tag_id,
            reason: 'character target not co-located with player',
          });
          break;
        }
        ensureNpcBucket(npcId).push(instruction);
        break;
      }

      case 'location': {
        const locationId = binding.target_entity_id;
        if (!locationId) {
          ignored.push({
            bindingId: binding.id,
            tagId: binding.tag_id,
            reason: 'location target missing target_entity_id',
          });
          break;
        }

        if (playerLocationId && locationId !== playerLocationId) {
          // Not active this turn.
          break;
        }

        ensureLocationBucket(locationId).push(instruction);
        break;
      }

      case 'player':
      case 'setting': {
        // Capability exists, but not used by MVP routing/rendering yet.
        ignored.push({
          bindingId: binding.id,
          tagId: binding.tag_id,
          reason: `target_type "${binding.target_type}" not implemented in MVP`,
        });
        break;
      }

      default: {
        ignored.push({
          bindingId: binding.id,
          tagId: binding.tag_id,
          reason: `unknown target_type "${binding.target_type}"`,
        });
        break;
      }
    }
  }

  return {
    session,
    byNpcInstanceId,
    byLocationId,
    playerLocationId: playerLocationId ?? null,
    ignored,
  };
}
