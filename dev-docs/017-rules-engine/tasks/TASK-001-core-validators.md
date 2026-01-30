# TASK-001: Implement Core Validators

**Priority**: P1
**Status**: ✅ Complete
**Estimate**: 4-6 hours
**Depends On**: None
**Category**: Rules Engine

---

## Objective

Implement validation rules for core intent types: MOVE_INTENT, SPEAK_INTENT, USE_ITEM_INTENT.

## Current Code

```typescript
// packages/services/src/rules/validators.ts
static validateAction(action: WorldEvent, context: ValidationContext): ValidationResult {
  // TODO: Implement validation rules per action type
  console.debug(`[Validators] Validating ${action.type}`);
  return { valid: true, reason: '' };
}
```

## Target Implementation

```typescript
import type { WorldEvent, Intent } from '@minimal-rpg/schemas';
import {
  getLocationConnections,
  getActorState,
  getInventoryItem,
} from '@minimal-rpg/db';

/**
 * Validation result for an action.
 */
export interface ValidationResult {
  valid: boolean;
  reason: string;
  /** Suggested alternative action if invalid */
  suggestion?: string;
}

/**
 * Game state context for validation.
 */
export interface ValidationContext {
  sessionId: string;
  actorId: string;
  currentLocationId: string;
  /** Actors present at current location */
  actorsAtLocation: string[];
  /** Items in actor's inventory */
  inventoryItemIds: string[];
  /** Current game time */
  gameTime?: { hour: number; minute: number };
}

/**
 * Validation rule function type.
 */
type ValidationRule = (
  event: WorldEvent,
  context: ValidationContext
) => Promise<ValidationResult>;

/**
 * Registry of validation rules per event type.
 */
const VALIDATION_RULES: Record<string, ValidationRule> = {
  MOVE_INTENT: validateMoveIntent,
  SPEAK_INTENT: validateSpeakIntent,
  USE_ITEM_INTENT: validateUseItemIntent,
  ATTACK_INTENT: validateAttackIntent,
  TAKE_ITEM_INTENT: validateTakeItemIntent,
};

/**
 * Validators Service
 */
export class Validators {
  /**
   * Validate if an action is possible in the current state.
   */
  static async validateAction(
    action: WorldEvent,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const rule = VALIDATION_RULES[action.type];

    if (!rule) {
      // No validator for this event type - allow by default
      return { valid: true, reason: '' };
    }

    return rule(action, context);
  }
}

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * Validate MOVE_INTENT - check if destination is reachable.
 */
async function validateMoveIntent(
  event: WorldEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  const moveEvent = event as { toLocationId?: string; fromLocationId?: string };

  if (!moveEvent.toLocationId) {
    return { valid: false, reason: 'No destination specified' };
  }

  // Check if destination is connected to current location
  const connections = await getLocationConnections(context.currentLocationId);
  const isConnected = connections.some(c => c.targetLocationId === moveEvent.toLocationId);

  if (!isConnected) {
    return {
      valid: false,
      reason: `Cannot reach ${moveEvent.toLocationId} from current location`,
      suggestion: `Available exits: ${connections.map(c => c.targetLocationId).join(', ')}`,
    };
  }

  // Check if path is blocked (future: add obstacle checking)
  // const isBlocked = await isPathBlocked(context.currentLocationId, moveEvent.toLocationId);

  return { valid: true, reason: '' };
}

/**
 * Validate SPEAK_INTENT - check if target is present.
 */
async function validateSpeakIntent(
  event: WorldEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  const speakEvent = event as { targetActorId?: string; content?: string };

  if (!speakEvent.content?.trim()) {
    return { valid: false, reason: 'Cannot speak without content' };
  }

  // If targeting a specific actor, check they're present
  if (speakEvent.targetActorId) {
    const isPresent = context.actorsAtLocation.includes(speakEvent.targetActorId);

    if (!isPresent) {
      return {
        valid: false,
        reason: `${speakEvent.targetActorId} is not at your current location`,
      };
    }

    // Check if target is interruptible
    const targetState = await getActorState(context.sessionId, speakEvent.targetActorId);
    if (targetState && !targetState.interruptible) {
      return {
        valid: false,
        reason: `${speakEvent.targetActorId} is too busy to talk right now`,
        suggestion: 'Try again later or wait for them to finish',
      };
    }
  }

  return { valid: true, reason: '' };
}

/**
 * Validate USE_ITEM_INTENT - check if actor has item.
 */
async function validateUseItemIntent(
  event: WorldEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  const useEvent = event as { itemId?: string; targetId?: string; action?: string };

  if (!useEvent.itemId) {
    return { valid: false, reason: 'No item specified' };
  }

  // Check if actor has the item
  const hasItem = context.inventoryItemIds.includes(useEvent.itemId);

  if (!hasItem) {
    const item = await getInventoryItem(context.sessionId, context.actorId, useEvent.itemId);
    if (!item) {
      return {
        valid: false,
        reason: `You don't have "${useEvent.itemId}"`,
      };
    }
  }

  // Check if target is valid (if specified)
  if (useEvent.targetId && !context.actorsAtLocation.includes(useEvent.targetId)) {
    // Target might be an object in the location, check that too
    // For now, allow if target is specified
  }

  return { valid: true, reason: '' };
}

/**
 * Validate ATTACK_INTENT - check combat rules.
 */
async function validateAttackIntent(
  event: WorldEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  const attackEvent = event as { targetActorId?: string };

  if (!attackEvent.targetActorId) {
    return { valid: false, reason: 'No target specified' };
  }

  // Check target is present
  if (!context.actorsAtLocation.includes(attackEvent.targetActorId)) {
    return {
      valid: false,
      reason: `${attackEvent.targetActorId} is not here`,
    };
  }

  // Future: Check if combat is allowed in this location
  // Future: Check if target is hostile/neutral/friendly

  return { valid: true, reason: '' };
}

/**
 * Validate TAKE_ITEM_INTENT - check if item is available.
 */
async function validateTakeItemIntent(
  event: WorldEvent,
  context: ValidationContext
): Promise<ValidationResult> {
  const takeEvent = event as { itemId?: string };

  if (!takeEvent.itemId) {
    return { valid: false, reason: 'No item specified' };
  }

  // Future: Check if item is in current location
  // Future: Check if item is owned by someone else
  // Future: Check if taking would be theft

  return { valid: true, reason: '' };
}
```

## Testing

```typescript
describe('Validators', () => {
  describe('validateMoveIntent', () => {
    it('should allow moves to connected locations', async () => {
      const context = createTestContext({ currentLocationId: 'tavern' });
      const event = { type: 'MOVE_INTENT', toLocationId: 'street' };

      // Mock: tavern connects to street
      mockGetLocationConnections(['street', 'cellar']);

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(true);
    });

    it('should block moves to unconnected locations', async () => {
      const context = createTestContext({ currentLocationId: 'tavern' });
      const event = { type: 'MOVE_INTENT', toLocationId: 'castle' };

      mockGetLocationConnections(['street', 'cellar']);

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Cannot reach');
    });
  });

  describe('validateSpeakIntent', () => {
    it('should allow speaking to present NPCs', async () => {
      const context = createTestContext({
        actorsAtLocation: ['bartender', 'merchant'],
      });
      const event = {
        type: 'SPEAK_INTENT',
        targetActorId: 'bartender',
        content: 'Hello!',
      };

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(true);
    });

    it('should block speaking to absent NPCs', async () => {
      const context = createTestContext({
        actorsAtLocation: ['merchant'],
      });
      const event = {
        type: 'SPEAK_INTENT',
        targetActorId: 'bartender',
        content: 'Hello!',
      };

      const result = await Validators.validateAction(event, context);
      expect(result.valid).toBe(false);
    });
  });
});
```

## Acceptance Criteria

- [x] MOVE_INTENT validated against location connections
- [x] SPEAK_INTENT validated against actor presence
- [x] USE_ITEM_INTENT validated against inventory
- [x] Validators method is async
- [x] Unknown event types pass by default
- [x] Unit tests pass

## Notes

- Validation should be fast (< 10ms per check)
- Consider caching location connections
- Rules can be extended via VALIDATION_RULES registry
