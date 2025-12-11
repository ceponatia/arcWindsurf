import {
  type ParsedAction,
  type ActionInterrupt,
  type ActionSequenceResult,
  type AccumulatedSensoryContext,
  type ActionSensoryContext,
  type PreconditionResult,
  type StateChange,
} from '@minimal-rpg/schemas';
import { type StateManager } from '@minimal-rpg/state-manager';
import { type Operation } from 'fast-json-patch';
import { type TurnStateContext } from './types.js';

/**
 * Configuration for the ActionSequencer.
 */
export interface ActionSequencerConfig {
  /** State manager for applying state changes */
  stateManager: StateManager;

  /**
   * Optional checker for action interrupts (NPC reactions, random events).
   * Called after each action's state changes are applied.
   */
  interruptChecker?: (
    action: ParsedAction,
    state: TurnStateContext
  ) => Promise<ActionInterrupt | null>;

  /**
   * Optional handler for collecting sensory context after an action.
   * If not provided, sensory context will be empty.
   */
  sensoryCollector?: (
    action: ParsedAction,
    state: TurnStateContext
  ) => Promise<Partial<ActionSensoryContext['sensory']>>;
}

/**
 * Processes sequences of actions with state updates and interrupt handling.
 * Each action in a sequence is processed in order, with state changes applied
 * incrementally and sensory context accumulated.
 */
export class ActionSequencer {
  constructor(private config: ActionSequencerConfig) {}

  /**
   * Process a sequence of actions with state updates and interrupt handling.
   *
   * @param actions - Ordered array of actions to process
   * @param initialState - Starting state context
   * @returns Result containing completed actions, interrupts, and accumulated context
   */
  async processSequence(
    actions: ParsedAction[],
    initialState: TurnStateContext
  ): Promise<ActionSequenceResult> {
    const completedActions: ParsedAction[] = [];
    const accumulatedContext: AccumulatedSensoryContext = { perAction: [] };
    let currentState = initialState;
    let interrupt: ActionInterrupt | null = null;

    for (const action of actions) {
      // 1. Check preconditions
      const preconditionResult = this.checkPreconditions(action, currentState);
      if (!preconditionResult.met) {
        interrupt = {
          interruptedActionId: action.id,
          reason: preconditionResult.reason ?? 'Precondition not met',
          source: 'rule',
          blocking: true,
          recoverable: false,
        };
        break;
      }

      // 2. Apply state changes
      currentState = this.applyStateChanges(action, currentState);

      // 3. Check for interrupts (NPC reactions, random events)
      if (this.config.interruptChecker) {
        interrupt = await this.config.interruptChecker(action, currentState);
        if (interrupt?.blocking) {
          completedActions.push(action); // Action completed but triggered interrupt
          break;
        }
      }

      // 4. Collect sensory context for this action
      const sensoryForAction = await this.collectSensoryContext(action, currentState);
      accumulatedContext.perAction.push({
        actionId: action.id,
        actionDescription: action.description,
        sensory: sensoryForAction,
      });

      completedActions.push(action);
    }

    const pendingActions = actions.slice(completedActions.length);

    return {
      completedActions,
      interruptedAt: interrupt ?? undefined,
      pendingActions,
      accumulatedContext,
      finalState: this.serializeState(currentState),
    };
  }

  /**
   * Check if preconditions for an action are met.
   * Override this method to implement custom precondition logic.
   */
  protected checkPreconditions(action: ParsedAction, state: TurnStateContext): PreconditionResult {
    // Default implementation: check explicit requirements if present
    if (!action.requirements || action.requirements.length === 0) {
      return { met: true };
    }

    for (const req of action.requirements) {
      const result = this.checkRequirement(req, state);
      if (!result.met) {
        return result;
      }
    }

    return { met: true };
  }

  /**
   * Check a single requirement against state.
   */
  private checkRequirement(
    requirement: { type: string; target: string; description: string },
    state: TurnStateContext
  ): PreconditionResult {
    // Basic implementation - can be extended with more sophisticated checks
    switch (requirement.type) {
      case 'location':
        // Check if player is in the required location
        if (state.location && typeof state.location === 'object') {
          const locationId = state.location['id'];
          if (locationId !== requirement.target) {
            return {
              met: false,
              reason: `Must be in ${requirement.target}, currently in ${String(locationId)}`,
            };
          }
        }
        break;

      case 'item':
        // Check if player has the required item
        if (state.inventory && typeof state.inventory === 'object') {
          const items = state.inventory['items'];
          if (Array.isArray(items)) {
            const hasItem = items.some(
              (item: unknown) =>
                typeof item === 'object' &&
                item !== null &&
                (item as Record<string, unknown>)['id'] === requirement.target
            );
            if (!hasItem) {
              return {
                met: false,
                reason: `Missing required item: ${requirement.target}`,
              };
            }
          }
        }
        break;

      case 'state':
      case 'proximity':
        // These would require more context - for now, assume they're met
        // TODO: Implement more sophisticated state/proximity checks
        break;
    }

    return { met: true };
  }

  /**
   * Apply state changes from an action.
   * This creates patches and applies them to generate a new state.
   */
  protected applyStateChanges(
    action: ParsedAction,
    currentState: TurnStateContext
  ): TurnStateContext {
    if (!action.stateChanges || action.stateChanges.length === 0) {
      return currentState;
    }

    // Convert state changes to JSON patches
    const patches: Operation[] = [];
    for (const change of action.stateChanges) {
      const patch = this.stateChangeToJsonPatch(change);
      if (patch) {
        patches.push(patch);
      }
    }

    if (patches.length === 0) {
      return currentState;
    }

    // Apply patches through state manager
    try {
      const result = this.config.stateManager.applyPatches(
        currentState,
        {},
        patches,
        { computeMinimalDiff: false } // Get full effective state back
      );
      return result.newEffective;
    } catch (error) {
      console.error('Failed to apply state changes for action:', action.id, error);
      return currentState; // Return unchanged on error
    }
  }

  /**
   * Convert a state change to a JSON Patch operation.
   */
  private stateChangeToJsonPatch(change: StateChange): Operation | null {
    const path = `/${change.entity}/${change.property}`;

    if (change.newValue === undefined && change.oldValue !== undefined) {
      // Removal
      return { op: 'remove', path };
    } else if (change.oldValue === undefined && change.newValue !== undefined) {
      // Addition
      return { op: 'add', path, value: change.newValue };
    } else {
      // Replacement
      return { op: 'replace', path, value: change.newValue };
    }
  }

  /**
   * Collect sensory context for an action.
   */
  protected async collectSensoryContext(
    action: ParsedAction,
    state: TurnStateContext
  ): Promise<Partial<ActionSensoryContext['sensory']>> {
    if (!this.config.sensoryCollector) {
      return {};
    }

    try {
      return await this.config.sensoryCollector(action, state);
    } catch (error) {
      console.error('Failed to collect sensory context for action:', action.id, error);
      return {};
    }
  }

  /**
   * Serialize state to a plain object for the result.
   */
  private serializeState(state: TurnStateContext): Record<string, unknown> {
    // TurnStateContext is already a record, but ensure it's serializable
    return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  }

  /**
   * Extract action descriptions for logging or debugging.
   */
  static describeActions(actions: ParsedAction[]): string[] {
    return actions.map((a) => `${a.order}. ${a.type}: ${a.description}`);
  }

  /**
   * Check if an interrupt would block remaining actions.
   */
  static isBlocking(interrupt: ActionInterrupt | null | undefined): boolean {
    return interrupt?.blocking ?? false;
  }
}

/**
 * Create a default action sequencer with no interrupts or sensory collection.
 */
export function createBasicActionSequencer(stateManager: StateManager): ActionSequencer {
  return new ActionSequencer({ stateManager });
}

/**
 * Create an action sequencer with sensory collection.
 */
export function createSensoryActionSequencer(
  stateManager: StateManager,
  sensoryCollector: NonNullable<ActionSequencerConfig['sensoryCollector']>
): ActionSequencer {
  return new ActionSequencer({ stateManager, sensoryCollector });
}

/**
 * Create an action sequencer with interrupt handling.
 */
export function createInterruptibleActionSequencer(
  stateManager: StateManager,
  interruptChecker: NonNullable<ActionSequencerConfig['interruptChecker']>,
  sensoryCollector?: NonNullable<ActionSequencerConfig['sensoryCollector']>
): ActionSequencer {
  const config: ActionSequencerConfig = {
    stateManager,
    interruptChecker,
  };
  if (sensoryCollector) {
    config.sensoryCollector = sensoryCollector;
  }
  return new ActionSequencer(config);
}
