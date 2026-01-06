/**
 * Validators Service
 *
 * Validation logic for various game actions.
 */
export class Validators {
  /**
   * Validate if an action is possible in the current state.
   */
  static validateAction(_action: any, _state: any) {
    return {
      valid: true,
      reason: ""
    };
  }
}
