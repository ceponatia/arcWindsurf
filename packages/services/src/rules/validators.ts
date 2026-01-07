import type { WorldEvent } from '@minimal-rpg/schemas';

/**
 * Validation result for an action.
 */
export interface ValidationResult {
  valid: boolean;
  reason: string;
}

/**
 * Game state context for validation.
 * TODO: Define proper GameState type in schemas when state structure is finalized.
 */
export interface ValidationContext {
  readonly currentLocationId?: string;
  readonly actorIds?: readonly string[];
  readonly itemIds?: readonly string[];
}

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
  static validateAction(action: WorldEvent, context: ValidationContext): ValidationResult {
    // TODO: Implement validation rules per action type
    // For now, log the validation attempt and allow all actions
    console.debug(
      `[Validators] Validating ${action.type} with context:`,
      context.currentLocationId ?? 'unknown location'
    );
    return {
      valid: true,
      reason: '',
    };
  }
}
