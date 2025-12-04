import { type Operation } from 'fast-json-patch';
import {
  type AgentRegistry,
  type Agent,
  type AgentInput,
  type AgentOutput,
  type AgentType,
  type AgentIntent,
  type IntentParams,
} from '@minimal-rpg/agents';
import { type RetrievalService } from '@minimal-rpg/retrieval';
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
  type DetectedIntent,
  type IntentDetector,
  type IntentDetectionContext,
  type IntentDetectionResult,
  type IntentDetectionDebug,
  type PhaseTiming,
  type AgentExecutionResult,
  type TurnExecutionResult,
  type TurnContext,
  DEFAULT_GOVERNOR_OPTIONS,
  TurnProcessingError,
} from './types.js';
import { DefaultContextBuilder, type ContextBuilderConfig } from './context-builder.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build IntentParams from DetectedIntent params, avoiding undefined assignments
 * for exactOptionalPropertyTypes compatibility.
 */
function buildIntentParams(params: DetectedIntent['params'] | undefined): IntentParams {
  const result: IntentParams = {};

  if (params?.target !== undefined) {
    result.target = params.target;
  }
  if (params?.direction !== undefined) {
    result.direction = params.direction;
  }
  if (params?.item !== undefined) {
    result.item = params.item;
  }
  if (params?.action !== undefined) {
    result.action = params.action;
  }
  if (params?.extra !== undefined) {
    result.extra = params.extra;
  }

  return result;
}

/**
 * Build AgentIntent from DetectedIntent, avoiding undefined assignments
 * for exactOptionalPropertyTypes compatibility.
 */
function buildAgentIntent(
  intent: DetectedIntent,
  mapIntentType: (type: DetectedIntent['type']) => AgentIntent['type']
): AgentIntent {
  const agentIntent: AgentIntent = {
    type: mapIntentType(intent.type),
    params: buildIntentParams(intent.params),
    confidence: intent.confidence,
  };

  if (intent.signals !== undefined) {
    agentIntent.signals = intent.signals;
  }

  return agentIntent;
}
import { createFallbackIntentDetector } from './intent-detector.js';

// ============================================================================
// Governor Implementation
// ============================================================================

/**
 * The Governor orchestrates turn processing in the game.
 *
 * It implements a 7-step flow:
 * 1. Intent Detection - Analyze player input to determine intent
 * 2. State Recall - Load effective state via StateManager
 * 3. Context Retrieval - Get relevant knowledge nodes
 * 4. Agent Routing - Dispatch to appropriate agents based on intent
 * 5. Agent Execution - Run agents and collect outputs
 * 6. State Update - Apply patches via StateManager
 * 7. Response Aggregation - Combine agent outputs into TurnResult
 */
export class Governor {
  private readonly stateManager: StateManager;
  private readonly retrievalService: RetrievalService | undefined;
  private readonly agentRegistry: AgentRegistry | undefined;
  private readonly intentDetector: IntentDetector;
  private readonly options: Required<GovernorOptions>;
  private readonly contextBuilder: DefaultContextBuilder;
  private readonly logging: GovernorConfig['logging'];

  constructor(config: GovernorConfig) {
    this.stateManager = config.stateManager;
    this.retrievalService = config.retrievalService;
    this.agentRegistry = config.agentRegistry;
    this.intentDetector = config.intentDetector ?? createFallbackIntentDetector();
    this.logging = config.logging;

    // Merge options with defaults, ensuring all values are defined
    const opts = config.options ?? {};
    this.options = {
      maxAgentsPerTurn: opts.maxAgentsPerTurn ?? DEFAULT_GOVERNOR_OPTIONS.maxAgentsPerTurn,
      continueOnAgentError:
        opts.continueOnAgentError ?? DEFAULT_GOVERNOR_OPTIONS.continueOnAgentError,
      applyPatchesOnPartialFailure:
        opts.applyPatchesOnPartialFailure ?? DEFAULT_GOVERNOR_OPTIONS.applyPatchesOnPartialFailure,
      intentConfidenceThreshold:
        opts.intentConfidenceThreshold ?? DEFAULT_GOVERNOR_OPTIONS.intentConfidenceThreshold,
      devMode: opts.devMode ?? DEFAULT_GOVERNOR_OPTIONS.devMode,
    };

    // Create context builder
    const contextBuilderConfig: ContextBuilderConfig = {
      stateManager: this.stateManager,
      retrievalService: this.retrievalService,
    };
    this.contextBuilder = new DefaultContextBuilder(contextBuilderConfig);
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
   * Handle a player turn.
   */
  async handleTurn(sessionIdOrInput: string | TurnInput, input?: string): Promise<TurnResult> {
    const startTime = Date.now();
    const phaseTiming: PhaseTiming = {};
    const events: TurnEvent[] = [];

    // Normalize input
    const turnInput: TurnInput =
      typeof sessionIdOrInput === 'string'
        ? { sessionId: sessionIdOrInput, playerInput: input! }
        : sessionIdOrInput;

    const { sessionId, playerInput } = turnInput;

    // Emit turn started event
    events.push({
      type: 'turn-started',
      timestamp: new Date(),
      payload: { sessionId, turnNumber: turnInput.turnNumber },
    });

    if (this.logging?.logTurns) {
      console.log(`[Governor] Turn started for session ${sessionId}: "${playerInput}"`);
    }

    try {
      // 1. Intent Detection
      const intentStart = Date.now();
      const detectionResult = await this.detectIntent(playerInput, turnInput);
      const intent = detectionResult.intent;
      const intentDebug = detectionResult.debug;
      phaseTiming.intentDetectionMs = Date.now() - intentStart;

      if (this.logging?.logIntentDetection) {
        console.log(
          `[Governor] Detected intent: ${intent.type} (confidence: ${intent.confidence.toFixed(2)})`
        );
      }

      events.push({
        type: 'intent-detected',
        timestamp: new Date(),
        payload: { intent: intent.type, confidence: intent.confidence },
      });

      // 2. State Recall
      const stateStart = Date.now();
      const baseline = turnInput.baseline ?? this.getDefaultBaseline();
      const overrides = turnInput.overrides ?? {};
      phaseTiming.stateRecallMs = Date.now() - stateStart;

      // 3. Context Retrieval + State Merge
      const contextStart = Date.now();
      const turnContext = await this.contextBuilder.build({
        sessionId,
        playerInput,
        intent,
        baseline,
        overrides,
        conversationHistory: turnInput.conversationHistory,
        turnNumber: turnInput.turnNumber,
      });
      phaseTiming.contextRetrievalMs = Date.now() - contextStart;

      if (this.logging?.logRetrieval) {
        console.log(`[Governor] Retrieved ${turnContext.knowledgeContext.length} knowledge nodes`);
      }

      // 4. Agent Routing
      const routingStart = Date.now();
      const agents = this.routeToAgents(intent);
      phaseTiming.agentRoutingMs = Date.now() - routingStart;

      if (agents.length === 0) {
        // No agents to handle this intent - return fallback response
        return this.createFallbackResult(
          turnInput,
          intent,
          intentDebug,
          startTime,
          phaseTiming,
          events
        );
      }

      // 5. Agent Execution
      const executionStart = Date.now();
      const executionResult = await this.executeAgents(agents, turnContext, events);
      phaseTiming.agentExecutionMs = Date.now() - executionStart;

      // 6. State Update
      const updateStart = Date.now();
      const stateChanges = this.applyStateChanges(
        baseline,
        overrides,
        executionResult.combinedPatches
      );
      phaseTiming.stateUpdateMs = Date.now() - updateStart;

      if (this.logging?.logStateChanges && stateChanges.patchCount > 0) {
        console.log(
          `[Governor] Applied ${stateChanges.patchCount} patches to paths: ${stateChanges.modifiedPaths.join(', ')}`
        );
      }

      // 7. Response Aggregation
      const aggregationStart = Date.now();
      const result = this.aggregateResponse(
        executionResult,
        stateChanges,
        intent,
        intentDebug,
        turnContext.knowledgeContext.length,
        startTime,
        phaseTiming,
        events
      );
      phaseTiming.responseAggregationMs = Date.now() - aggregationStart;

      // Emit turn completed event
      events.push({
        type: 'turn-completed',
        timestamp: new Date(),
        payload: { success: true, processingTimeMs: Date.now() - startTime },
      });

      if (this.logging?.logTurns) {
        console.log(
          `[Governor] Turn completed in ${Date.now() - startTime}ms with ${executionResult.successfulAgents.length} agents`
        );
      }

      return result;
    } catch (error) {
      return this.handleError(error, turnInput, startTime, phaseTiming, events);
    }
  }

  // ============================================================================
  // Phase 1: Intent Detection
  // ============================================================================

  private async detectIntent(
    playerInput: string,
    turnInput: TurnInput
  ): Promise<IntentDetectionResult> {
    // Build context for intent detection
    const context: IntentDetectionContext = {};

    if (turnInput.conversationHistory && turnInput.conversationHistory.length > 0) {
      context.recentHistory = turnInput.conversationHistory.slice(-5).map((t) => t.content);
    }

    // Extract available context from state
    if (turnInput.baseline?.location) {
      context.currentLocation =
        typeof turnInput.baseline.location['name'] === 'string'
          ? turnInput.baseline.location['name']
          : undefined;
    }

    if (turnInput.baseline?.inventory) {
      const items = turnInput.baseline.inventory['items'];
      if (Array.isArray(items)) {
        context.inventoryItems = items
          .filter(
            (item): item is { name: string } =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as Record<string, unknown>)['name'] === 'string'
          )
          .map((item) => (item as { name: string }).name);
      }
    }

    try {
      return await this.intentDetector.detect(playerInput, context);
    } catch (error) {
      const errorCause = error instanceof Error ? error : undefined;
      throw new TurnProcessingError(
        `Intent detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INTENT_DETECTION_FAILED',
        'intent-detection',
        errorCause ? { cause: errorCause } : undefined
      );
    }
  }

  // ============================================================================
  // Phase 4: Agent Routing
  // ============================================================================

  private routeToAgents(intent: DetectedIntent): Agent[] {
    if (!this.agentRegistry) {
      return [];
    }

    // Convert DetectedIntent to AgentIntent for routing
    const agentIntent = buildAgentIntent(intent, (t) => this.mapIntentType(t));

    // Find agents that can handle this intent
    const agents = this.agentRegistry.findForIntent(agentIntent);

    // Limit to max agents per turn
    return agents.slice(0, this.options.maxAgentsPerTurn);
  }

  /**
   * Map governor intent types to agent intent types.
   */
  private mapIntentType(type: DetectedIntent['type']): AgentIntent['type'] {
    // Most types map directly; map any that don't exist in agents
    const mapping: Record<DetectedIntent['type'], AgentIntent['type']> = {
      move: 'move',
      look: 'look',
      talk: 'talk',
      use: 'use',
      take: 'take',
      give: 'give',
      examine: 'look', // Map examine to look
      wait: 'custom',
      system: 'custom',
      unknown: 'custom',
    };

    return mapping[type];
  }

  // ============================================================================
  // Phase 5: Agent Execution
  // ============================================================================

  private async executeAgents(
    agents: Agent[],
    context: TurnContext,
    events: TurnEvent[]
  ): Promise<TurnExecutionResult> {
    const agentResults: AgentExecutionResult[] = [];
    const combinedPatches: Operation[] = [];
    const combinedEvents: TurnEvent[] = [];
    const successfulAgents: AgentType[] = [];
    const failedAgents: AgentType[] = [];
    const narratives: string[] = [];

    // Convert TurnContext to AgentInput
    const agentInput: AgentInput = {
      sessionId: context.sessionId,
      playerInput: context.playerInput,
      intent: buildAgentIntent(context.intent, (t) => this.mapIntentType(t)),
      stateSlices: context.stateSlices,
      knowledgeContext: context.knowledgeContext,
      conversationHistory: context.conversationHistory,
    };

    for (const agent of agents) {
      events.push({
        type: 'agent-started',
        timestamp: new Date(),
        payload: { agentType: agent.agentType },
        source: agent.agentType,
      });

      if (this.logging?.logAgents) {
        console.log(`[Governor] Executing agent: ${agent.name} (${agent.agentType})`);
      }

      const result = await this.executeAgent(agent, agentInput);
      agentResults.push(result);

      events.push({
        type: 'agent-completed',
        timestamp: new Date(),
        payload: {
          agentType: agent.agentType,
          success: result.success,
          executionTimeMs: result.executionTimeMs,
        },
        source: agent.agentType,
      });

      if (result.success) {
        successfulAgents.push(agent.agentType);
        narratives.push(result.output.narrative);

        if (result.output.statePatches) {
          combinedPatches.push(...result.output.statePatches);
        }

        if (result.output.events) {
          for (const agentEvent of result.output.events) {
            combinedEvents.push({
              type: 'custom',
              timestamp: new Date(),
              payload: agentEvent.payload,
              source: agentEvent.source,
            });
          }
        }
      } else {
        failedAgents.push(agent.agentType);

        if (!this.options.continueOnAgentError) {
          break;
        }
      }
    }

    return {
      agentResults,
      combinedNarrative: narratives.join('\n\n'),
      combinedPatches,
      combinedEvents,
      successfulAgents,
      failedAgents,
    };
  }

  private async executeAgent(agent: Agent, input: AgentInput): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    try {
      const output = await agent.execute(input);
      return {
        agentType: agent.agentType,
        output,
        executionTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      const errorOutput: AgentOutput = {
        narrative: `An error occurred while processing your action.`,
        diagnostics: {
          warnings: [error instanceof Error ? error.message : 'Unknown error'],
        },
      };

      return {
        agentType: agent.agentType,
        output: errorOutput,
        executionTimeMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  // ============================================================================
  // Phase 6: State Update
  // ============================================================================

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
      const result = this.stateManager.applyPatches(baseline, overrides, patches);

      return {
        patchCount: result.patchesApplied,
        modifiedPaths: result.modifiedPaths,
        patches,
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
  // Phase 7: Response Aggregation
  // ============================================================================

  private aggregateResponse(
    executionResult: TurnExecutionResult,
    stateChanges: TurnStateChanges,
    intent: DetectedIntent,
    intentDebug: IntentDetectionDebug | undefined,
    nodesRetrieved: number,
    startTime: number,
    phaseTiming: PhaseTiming,
    events: TurnEvent[]
  ): TurnResult {
    const processingTimeMs = Date.now() - startTime;

    const metadata: TurnMetadata = {
      processingTimeMs,
      agentsInvoked: [...executionResult.successfulAgents, ...executionResult.failedAgents],
      nodesRetrieved,
      phaseTiming,
    };

    if (this.options.devMode) {
      metadata.intent = intent;
      metadata.intentDebug = intentDebug;
      metadata.agentOutputs = executionResult.agentResults.map((r) => r.output);
    }

    // Add events from agent execution
    events.push(...executionResult.combinedEvents);

    // Add state update event if changes were made
    if (stateChanges.patchCount > 0) {
      events.push({
        type: 'state-updated',
        timestamp: new Date(),
        payload: {
          patchCount: stateChanges.patchCount,
          modifiedPaths: stateChanges.modifiedPaths,
        },
      });
    }

    return {
      message: executionResult.combinedNarrative || 'Nothing happens.',
      events,
      stateChanges: stateChanges.patchCount > 0 ? stateChanges : undefined,
      metadata,
      success: true,
    };
  }

  // ============================================================================
  // Fallback and Error Handling
  // ============================================================================

  private createFallbackResult(
    turnInput: TurnInput,
    intent: DetectedIntent,
    intentDebug: IntentDetectionDebug | undefined,
    startTime: number,
    phaseTiming: PhaseTiming,
    events: TurnEvent[]
  ): TurnResult {
    const processingTimeMs = Date.now() - startTime;

    const metadata: TurnMetadata = {
      processingTimeMs,
      agentsInvoked: [],
      nodesRetrieved: 0,
      phaseTiming,
    };

    if (this.options.devMode) {
      metadata.intent = intent;
      metadata.intentDebug = intentDebug;
    }

    const message =
      intent.type === 'unknown' || intent.confidence < this.options.intentConfidenceThreshold
        ? `I'm not sure what you want to do. Try commands like "look", "go north", "talk to [name]", or "use [item]".`
        : this.generateIntentNarrative(intent, turnInput.playerInput);

    events.push({
      type: 'turn-completed',
      timestamp: new Date(),
      payload: { success: true, processingTimeMs, usedFallback: true },
    });

    return {
      message,
      events,
      metadata,
      success: true,
    };
  }

  private generateIntentNarrative(intent: DetectedIntent, playerInput: string): string {
    const params = intent.params ?? {};
    const target = params.target?.trim();
    const direction = params.direction?.trim();
    const item = params.item?.trim();
    const quotedInput = playerInput.trim();
    const safeInput = quotedInput.length > 0 ? quotedInput : 'that action';

    switch (intent.type) {
      case 'move': {
        if (direction) {
          return `You set off ${direction}, letting the world unfold a few careful steps at a time.`;
        }
        if (target) {
          return `You start toward ${target}, gauging the terrain as you go.`;
        }
        return 'You shift your footing and prepare to move, mapping out a path in your head.';
      }
      case 'look': {
        if (target) {
          return `You study ${target} with a steady gaze, searching for anything out of place.`;
        }
        return 'You slow down and take in the scene, cataloging every texture, light, and shadow.';
      }
      case 'examine': {
        if (target) {
          return `You lean in close to ${target}, tracing every detail with practiced care.`;
        }
        return 'You run your fingers along the nearest surface, committing each detail to memory.';
      }
      case 'talk': {
        if (target) {
          return `You draw a breath and prepare your words for ${target}.`;
        }
        return 'You search for someone willing to listen, rehearsing an opening line under your breath.';
      }
      case 'use': {
        if (item && target) {
          return `You ready ${item} and picture how it might affect ${target}.`;
        }
        if (item) {
          return `You test the weight of ${item}, looking for the right moment to act.`;
        }
        return 'You think through your options, hands hovering over the tools you carry.';
      }
      case 'take': {
        if (item ?? target) {
          const noun = item ?? target;
          return `You reach toward ${noun}, judging whether it can be claimed without trouble.`;
        }
        return 'You take stock of what might be worth grabbing before it slips away.';
      }
      case 'give': {
        if (item && target) {
          return `You weigh the choice of passing ${item} to ${target}, wondering what it might earn you.`;
        }
        if (item) {
          return `You turn ${item} over in your hands, deciding who deserves it.`;
        }
        return 'You glance at what you carry, considering what you could offer and to whom.';
      }
      case 'wait': {
        return 'You pause, letting the moment breathe while you listen for the next cue.';
      }
      case 'system': {
        return `System actions like "${safeInput}" are noted for later, but the story keeps moving for now.`;
      }
      default:
        return `You can't do that right now, but the urge to ${safeInput.toLowerCase()} lingers.`;
    }
  }

  private handleError(
    error: unknown,
    _turnInput: TurnInput,
    startTime: number,
    phaseTiming: PhaseTiming,
    events: TurnEvent[]
  ): TurnResult {
    const processingTimeMs = Date.now() - startTime;

    const turnError =
      error instanceof TurnProcessingError
        ? error.toTurnError()
        : {
            code: 'UNKNOWN_ERROR' as const,
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            phase: 'response-aggregation' as const,
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

    const metadata: TurnMetadata = {
      processingTimeMs,
      agentsInvoked: [],
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
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a Governor with the given configuration.
 */
export function createGovernor(config: GovernorConfig): Governor {
  return new Governor(config);
}
