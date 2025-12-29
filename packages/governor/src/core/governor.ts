import { type Operation } from 'fast-json-patch';
import { type StateManager, type DeepPartial } from '@minimal-rpg/state-manager';
import {
  type GovernorConfig,
  type GovernorOptions,
  type TurnResult,
  type TurnInput,
  type TurnStateContext,
  type TurnEvent,
  type TurnMetadata,
  type TurnStateChanges,
  type PhaseTiming,
  type ToolTurnHandler,
  DEFAULT_GOVERNOR_OPTIONS,
  TurnProcessingError,
} from './types.js';

// ============================================================================
// Governor Implementation
// ============================================================================

/**
 * The Governor orchestrates turn processing in the game.
 *
 * The Governor delegates turn processing to an injected ToolTurnHandler
 * implementation (e.g., the NpcTurnHandler). This keeps orchestration and
 * state management here while agent-specific logic lives in the agents package.
 */
export class Governor {
  private readonly stateManager: StateManager;
  private readonly options: Required<GovernorOptions>;
  private readonly logging: GovernorConfig['logging'];
  private readonly toolTurnHandler: ToolTurnHandler;

  constructor(config: GovernorConfig) {
    if (!config.toolTurnHandler) {
      throw new Error('[Governor] toolTurnHandler is required - classic mode has been removed');
    }

    this.stateManager = config.stateManager;
    this.logging = config.logging;
    this.toolTurnHandler = config.toolTurnHandler;

    // Merge options with defaults, ensuring all values are defined
    const opts = config.options ?? {};
    this.options = {
      devMode: opts.devMode ?? DEFAULT_GOVERNOR_OPTIONS.devMode,
      npcInterjectionThreshold:
        opts.npcInterjectionThreshold ?? DEFAULT_GOVERNOR_OPTIONS.npcInterjectionThreshold,
      useActionSequencer: opts.useActionSequencer ?? DEFAULT_GOVERNOR_OPTIONS.useActionSequencer,
    };
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Handle a player turn with session ID and input string.
   */
  async handleTurn(sessionId: string, input: string): Promise<TurnResult>;

  /**
   * Handle a player turn with a TurnInput object.
   */
  async handleTurn(turnInput: TurnInput): Promise<TurnResult>;

  /**
   * Handle a player turn using the tool-based turn handler.
   */
  async handleTurn(sessionIdOrInput: string | TurnInput, input?: string): Promise<TurnResult> {
    // Normalize input
    const turnInput: TurnInput =
      typeof sessionIdOrInput === 'string'
        ? { sessionId: sessionIdOrInput, playerInput: input! }
        : sessionIdOrInput;

    const startTime = Date.now();
    const events: TurnEvent[] = [];

    // Emit turn started event
    events.push({
      type: 'turn-started',
      timestamp: new Date(),
      payload: { sessionId: turnInput.sessionId, turnNumber: turnInput.turnNumber },
    });

    if (this.logging?.logTurns) {
      console.log(
        `[Governor] Processing turn for session ${turnInput.sessionId}: "${turnInput.playerInput.slice(0, 50)}..."`
      );
    }

    try {
      // Delegate to tool-based turn handler
      const result = await this.toolTurnHandler.handleTurn(turnInput);

      // Apply any state patches returned from tool execution
      if (result.stateChanges?.patches && result.stateChanges.patches.length > 0) {
        const baseline = turnInput.baseline ?? this.getDefaultBaseline();
        const overrides = turnInput.overrides ?? {};
        const appliedChanges = this.applyStateChanges(
          baseline,
          overrides,
          result.stateChanges.patches
        );

        // Merge applied state changes back into result
        if (
          appliedChanges.newEffectiveState !== undefined ||
          appliedChanges.newOverrides !== undefined
        ) {
          const updatedStateChanges: TurnStateChanges = {
            ...result.stateChanges,
          };
          if (appliedChanges.newEffectiveState !== undefined) {
            updatedStateChanges.newEffectiveState = appliedChanges.newEffectiveState;
          }
          if (appliedChanges.newOverrides !== undefined) {
            updatedStateChanges.newOverrides = appliedChanges.newOverrides;
          }
          result.stateChanges = updatedStateChanges;
        }

        if (this.logging?.logStateChanges && appliedChanges.patchCount > 0) {
          console.log(
            `[Governor] Applied ${appliedChanges.patchCount} patches to paths: ${appliedChanges.modifiedPaths.join(', ')}`
          );
        }
      }

      if (this.logging?.logTurns) {
        console.log(`[Governor] Turn completed in ${Date.now() - startTime}ms`);
      }

      return result;
    } catch (error) {
      return this.handleError(error, turnInput, startTime, events);
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Apply state patches from tool execution.
   */
  private applyStateChanges(
    baseline: TurnStateContext,
    overrides: DeepPartial<TurnStateContext>,
    patches: Operation[]
  ): TurnStateChanges {
    if (patches.length === 0) {
      return {
        patchCount: 0,
        modifiedPaths: [],
      };
    }

    try {
      const result = this.stateManager.applyPatches<TurnStateContext>(baseline, overrides, patches);

      return {
        patchCount: result.patchesApplied,
        modifiedPaths: result.modifiedPaths,
        patches,
        newEffectiveState: result.newEffective,
        newOverrides: result.newOverrides,
      };
    } catch (error) {
      const errorCause = error instanceof Error ? error : undefined;
      throw new TurnProcessingError(
        `State update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STATE_UPDATE_FAILED',
        'state-update',
        errorCause ? { cause: errorCause } : undefined
      );
    }
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  private handleError(
    error: unknown,
    _turnInput: TurnInput,
    startTime: number,
    events: TurnEvent[]
  ): TurnResult {
    const processingTimeMs = Date.now() - startTime;

    const turnError =
      error instanceof TurnProcessingError
        ? error.toTurnError()
        : {
            code: 'UNKNOWN_ERROR' as const,
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            phase: 'tool-execution' as const,
            cause: error instanceof Error ? error : undefined,
          };

    events.push({
      type: 'error',
      timestamp: new Date(),
      payload: { code: turnError.code, message: turnError.message, phase: turnError.phase },
    });

    events.push({
      type: 'turn-completed',
      timestamp: new Date(),
      payload: { success: false, processingTimeMs },
    });

    const phaseTiming: PhaseTiming = {};
    const metadata: TurnMetadata = {
      processingTimeMs,
      agentsInvoked: [],
      nodesRetrieved: 0,
      phaseTiming,
    };

    return {
      message: 'An error occurred while processing your action. Please try again.',
      events,
      metadata,
      success: false,
      error: turnError,
    };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private getDefaultBaseline(): TurnStateContext {
    return {
      character: {},
      setting: {},
      location: {},
      inventory: {},
      time: {},
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Governor with the given configuration.
 * Requires toolTurnHandler to be provided.
 */
export function createGovernor(config: GovernorConfig): Governor {
  return new Governor(config);
}
