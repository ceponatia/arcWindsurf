# TASK-003: Implement use_item Handler

**Priority**: P2
**Estimate**: 2-4 hours
**Depends On**: None
**Category**: Tool Handlers

---

## Objective

Implement the `use_item` tool handler that applies item effects when the player uses inventory items.

## Tool Definition

```typescript
// From packages/llm/src/tools/tool-definitions.ts
export const USE_ITEM_TOOL = {
  type: 'function',
  function: {
    name: 'use_item',
    description: 'Use an item from inventory on a target or self',
    parameters: {
      type: 'object',
      properties: {
        item_id: { type: 'string', description: 'ID of the item to use' },
        target_id: {
          type: 'string',
          description: 'ID of target actor or object (optional, defaults to self)',
        },
        action: {
          type: 'string',
          description: 'Specific action to perform with the item',
        },
      },
      required: ['item_id'],
    },
  },
};
```

## Target Implementation

```typescript
// packages/api/src/game/tools/handlers.ts

import { worldBus } from '@minimal-rpg/bus';
import {
  getInventoryItem,
  removeInventoryItem,
  updateActorStats,
  getActorById,
  getItemEffects,
  applyEffect,
} from '@minimal-rpg/db';
import type { Item, ItemEffect } from '@minimal-rpg/schemas';

interface UseItemArgs {
  item_id: string;
  target_id?: string;
  action?: string;
}

/**
 * Handle use_item tool call.
 *
 * Uses an item from inventory, applying its effects to the target.
 */
async function handleUseItem(
  args: UseItemArgs,
  context: SessionContext
): Promise<ToolResult> {
  const { item_id, target_id, action } = args;
  const { sessionId, actorId } = context;

  // Get item from player's inventory
  const item = await getInventoryItem(sessionId, actorId, item_id);

  if (!item) {
    return {
      success: false,
      error: `You don't have "${item_id}" in your inventory.`,
    };
  }

  // Check if item is usable
  if (!item.usable) {
    return {
      success: false,
      error: `${item.name} cannot be used that way.`,
    };
  }

  // Determine target
  const targetActorId = target_id ?? actorId; // Default to self
  const targetActor = await getActorById(sessionId, targetActorId);

  if (target_id && !targetActor) {
    return {
      success: false,
      error: `Target "${target_id}" not found.`,
    };
  }

  // Get item effects
  const effects = await getItemEffects(item.id, action);

  if (effects.length === 0) {
    return {
      success: false,
      error: `${item.name} has no effect when used${action ? ` with "${action}"` : ''}.`,
    };
  }

  // Apply effects
  const appliedEffects: AppliedEffect[] = [];

  for (const effect of effects) {
    const result = await applyItemEffect(sessionId, targetActorId, effect);
    appliedEffects.push(result);
  }

  // Handle consumable items
  if (item.consumable) {
    if (item.quantity && item.quantity > 1) {
      // Reduce quantity
      await updateItemQuantity(sessionId, actorId, item_id, item.quantity - 1);
    } else {
      // Remove from inventory
      await removeInventoryItem(sessionId, actorId, item_id);
    }
  }

  // Emit event
  await worldBus.emit({
    type: 'ITEM_USED',
    sessionId,
    actorId,
    itemId: item_id,
    targetActorId: targetActorId,
    action: action ?? 'use',
    effects: appliedEffects.map(e => e.description),
    consumed: item.consumable ?? false,
    timestamp: new Date(),
  });

  return {
    success: true,
    data: {
      item: item.name,
      target: targetActor?.name ?? 'yourself',
      effects: appliedEffects,
      consumed: item.consumable ?? false,
      remainingQuantity: item.consumable
        ? (item.quantity ? item.quantity - 1 : 0)
        : undefined,
    },
  };
}

interface AppliedEffect {
  type: string;
  description: string;
  value?: number;
}

/**
 * Apply a single item effect to a target.
 */
async function applyItemEffect(
  sessionId: string,
  targetActorId: string,
  effect: ItemEffect
): Promise<AppliedEffect> {
  switch (effect.type) {
    case 'heal': {
      const amount = effect.value ?? 10;
      await updateActorStats(sessionId, targetActorId, {
        health: { delta: amount, clampMax: true },
      });
      return {
        type: 'heal',
        description: `Restored ${amount} health`,
        value: amount,
      };
    }

    case 'restore_mana': {
      const amount = effect.value ?? 10;
      await updateActorStats(sessionId, targetActorId, {
        mana: { delta: amount, clampMax: true },
      });
      return {
        type: 'restore_mana',
        description: `Restored ${amount} mana`,
        value: amount,
      };
    }

    case 'buff': {
      const duration = effect.duration ?? 300; // 5 minutes default
      await applyEffect(sessionId, targetActorId, {
        type: effect.buffType ?? 'generic',
        value: effect.value,
        duration,
        source: 'item',
      });
      return {
        type: 'buff',
        description: `Applied ${effect.buffType ?? 'buff'} effect for ${duration}s`,
        value: effect.value,
      };
    }

    case 'damage': {
      const amount = effect.value ?? 5;
      await updateActorStats(sessionId, targetActorId, {
        health: { delta: -amount, clampMin: 0 },
      });
      return {
        type: 'damage',
        description: `Dealt ${amount} damage`,
        value: amount,
      };
    }

    case 'unlock': {
      // Unlock a door/container in the location
      await applyEffect(sessionId, targetActorId, {
        type: 'unlock',
        targetObjectId: effect.targetObjectId,
      });
      return {
        type: 'unlock',
        description: 'Unlocked the target',
      };
    }

    default:
      return {
        type: effect.type,
        description: `Applied ${effect.type} effect`,
        value: effect.value,
      };
  }
}
```

## Testing

```typescript
describe('handleUseItem', () => {
  const context = createTestContext({
    sessionId: 'test-session',
    actorId: 'player',
    locationId: 'tavern',
  });

  it('should apply healing potion effect', async () => {
    mockGetInventoryItem({
      id: 'health-potion',
      name: 'Health Potion',
      usable: true,
      consumable: true,
      quantity: 3,
    });
    mockGetActorById({ id: 'player', name: 'Player' });
    mockGetItemEffects([{ type: 'heal', value: 50 }]);

    const result = await handleUseItem(
      { item_id: 'health-potion' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.effects[0].type).toBe('heal');
    expect(result.data.consumed).toBe(true);
    expect(mockUpdateActorStats).toHaveBeenCalledWith(
      'test-session',
      'player',
      { health: { delta: 50, clampMax: true } }
    );
  });

  it('should use item on target NPC', async () => {
    mockGetInventoryItem({
      id: 'poison',
      name: 'Poison',
      usable: true,
      consumable: true,
    });
    mockGetActorById({ id: 'enemy', name: 'Goblin' });
    mockGetItemEffects([{ type: 'damage', value: 20 }]);

    const result = await handleUseItem(
      { item_id: 'poison', target_id: 'enemy' },
      context
    );

    expect(result.success).toBe(true);
    expect(result.data.target).toBe('Goblin');
    expect(mockUpdateActorStats).toHaveBeenCalledWith(
      'test-session',
      'enemy',
      { health: { delta: -20, clampMin: 0 } }
    );
  });

  it('should fail for missing item', async () => {
    mockGetInventoryItem(null);

    const result = await handleUseItem(
      { item_id: 'nonexistent' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("don't have");
  });

  it('should fail for non-usable item', async () => {
    mockGetInventoryItem({
      id: 'rock',
      name: 'Rock',
      usable: false,
    });

    const result = await handleUseItem(
      { item_id: 'rock' },
      context
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be used');
  });
});
```

## Acceptance Criteria

- [x] Items can be used from inventory (matched by name/id)
- [x] Consumable items are decremented/removed
- [x] Target parameter supported
- [x] Error for missing items in inventory
- [x] Error for non-usable items
- [x] ITEM_USED event emitted via WorldBus
- [ ] Unit tests pass (tests not yet implemented)

## Notes

- Item effects should be data-driven
- Consider cooldowns for powerful items
- Some items may have multiple use modes (action parameter)
