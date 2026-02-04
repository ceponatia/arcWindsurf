import type { ActionValidationResult, GameTime, WorldEvent } from '@minimal-rpg/schemas';
import {
  getLocationConnections,
  getActorState,
  getInventoryItem,
  LocationDataValidationError,
} from '@minimal-rpg/db';

/**
 * Validation result for an action.
 */
type ValidationResult = ActionValidationResult;

/**
 * Game state context for validation.
 * TODO: Define proper GameState type in schemas when state structure is finalized.
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
  gameTime?: GameTime;
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
 *
 * Validation logic for various game actions.
 */
export class Validators {
  /**
   * Validate if an action is possible in the current state.
   * @param action - The world event/action to validate
   * @param context - Current game state context for validation
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getInterruptibleFlag(state: unknown): boolean | null {
  if (!isRecord(state)) return null;

  const locationState = state['locationState'];
  if (isRecord(locationState) && typeof locationState['interruptible'] === 'boolean') {
    return locationState['interruptible'];
  }

  const simulation = state['simulation'];
  if (isRecord(simulation)) {
    const currentState = simulation['currentState'];
    if (isRecord(currentState) && typeof currentState['interruptible'] === 'boolean') {
      return currentState['interruptible'];
    }
  }

  if (typeof state['interruptible'] === 'boolean') {
    return state['interruptible'];
  }

  return null;
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
  const moveEvent = event as { destinationId?: string };

  if (!moveEvent.destinationId) {
    return { valid: false, reason: 'No destination specified' };
  }

  let connections: Awaited<ReturnType<typeof getLocationConnections>>;

  try {
    connections = await getLocationConnections(context.sessionId, context.currentLocationId);
  } catch (error) {
    if (error instanceof LocationDataValidationError) {
      console.error('[Validators] Invalid location map data detected', error.details);
      return {
        valid: false,
        reason: 'Location map data is invalid. Please delete or repair the map.',
      };
    }
    throw error;
  }
  const isConnected = connections.some(
    (connection) => connection.targetLocationId === moveEvent.destinationId
  );

  if (!isConnected) {
    const exits = connections.map((connection) => connection.targetName ?? connection.targetLocationId);

    const result: ValidationResult = {
      valid: false,
      reason: `Cannot reach ${moveEvent.destinationId} from current location`,
    };

    if (exits.length > 0) {
      result.suggestion = `Available exits: ${exits.join(', ')}`;
    }

    return result;
  }

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

  if (speakEvent.targetActorId) {
    const isPresent = context.actorsAtLocation.includes(speakEvent.targetActorId);

    if (!isPresent) {
      return {
        valid: false,
        reason: `${speakEvent.targetActorId} is not at your current location`,
      };
    }

    const targetState = await getActorState(context.sessionId, speakEvent.targetActorId);
    if (targetState) {
      const interruptible = getInterruptibleFlag(targetState.state);
      if (interruptible === false) {
        return {
          valid: false,
          reason: `${speakEvent.targetActorId} is too busy to talk right now`,
          suggestion: 'Try again later or wait for them to finish',
        };
      }
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

  const hasItem = context.inventoryItemIds.includes(useEvent.itemId);

  if (!hasItem) {
    const item = await getInventoryItem(
      context.sessionId,
      context.actorId,
      useEvent.itemId
    );
    if (!item) {
      return {
        valid: false,
        reason: `You don't have "${useEvent.itemId}"`,
      };
    }
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

  if (!context.actorsAtLocation.includes(attackEvent.targetActorId)) {
    return {
      valid: false,
      reason: `${attackEvent.targetActorId} is not here`,
    };
  }

  return { valid: true, reason: '' };
}

/**
 * Validate TAKE_ITEM_INTENT - check if item is available.
 */
async function validateTakeItemIntent(
  event: WorldEvent,
  _context: ValidationContext
): Promise<ValidationResult> {
  void _context;
  const takeEvent = event as { itemId?: string };

  if (!takeEvent.itemId) {
    return { valid: false, reason: 'No item specified' };
  }

  return { valid: true, reason: '' };
}
