/**
 * Context for dialogue resolution.
 */
export interface DialogueContext {
  /** Current conversation topic or state */
  topic?: string;
  /** Previous dialogue history (last N exchanges) */
  history?: readonly string[];
  /** Player's relationship level with the NPC */
  relationshipLevel?: number;
  /** Current location ID */
  locationId?: string;
}

/**
 * Response from dialogue resolution.
 */
export interface DialogueResponse {
  content: string;
  options: readonly string[];
}

/**
 * Dialogue Service
 *
 * Manages conversation state and dialogue trees.
 */
export class DialogueService {
  /**
   * Resolve dialogue response based on character state and input.
   * @param actorId - The NPC actor ID
   * @param context - Dialogue context for resolution
   */
  static resolveResponse(actorId: string, context: DialogueContext): DialogueResponse {
    // TODO: Implement dialogue tree resolution using actorId and context
    // For now, return placeholder acknowledging the actor
    console.debug(
      `[DialogueService] Resolving dialogue for actor ${actorId}, topic: ${context.topic ?? 'general'}`
    );
    return {
      content: "I'm listening...",
      options: [],
    };
  }
}
