/**
 * Tool Executor - Executes tool calls using existing agents.
 *
 * This class bridges LLM tool calls to existing agent implementations.
 * It parses tool arguments, calls the appropriate agent, and returns
 * structured results for the LLM to weave into narrative.
 */
import type { Operation } from 'fast-json-patch';
import type { ToolCall, ToolResult, StatePatches } from './types.js';
import { cloneJsonLike } from '../utils/clone.js';
import type { AgentStateSlices, NpcAgent, NpcAgentInput, SensoryAgent } from '@minimal-rpg/agents';
import { HygieneService } from '@minimal-rpg/characters';
import type {
  ProximityState,
  ProximityLevel,
  ProximityAction,
  SenseType,
  EngagementIntensity,
  SensoryEngagement,
  TimeConfig,
  SessionTimeState,
  TickResult,
  CharacterInstanceAffinity,
  AffinityEffect,
  AffinityDimension,
  NpcLocationState,
  CrowdLevel,
} from '@minimal-rpg/schemas';
import {
  createDefaultProximityState,
  makeEngagementKey,
  DEFAULT_TIME_CONFIG,
  tick,
  formatGameTime,
  validateTimeSkip,
  updateTimeStateFromTick,
  createInitialTimeState,
  createCharacterInstanceAffinity,
  applyAffinityEffect,
  calculateDisposition,
  buildAffinityContext,
  AFFINITY_EFFECTS,
  categorizeCrowdLevel,
} from '@minimal-rpg/schemas';
import { ProximityManager } from '../proximity/index.js';
import type { TurnTagContext, TagInstruction } from '../core/types.js';

// =============================================================================
// Tool Argument Types
// =============================================================================

interface SensoryToolArgs {
  sense_type: 'smell' | 'touch' | 'taste' | 'look' | 'listen';
  target: string;
  body_part?: string;
}

interface NpcDialogueToolArgs {
  npc_id: string;
  player_utterance: string;
  interaction_type?: 'speech' | 'action' | 'emote' | 'thought';
  tone?: 'friendly' | 'hostile' | 'neutral' | 'flirty' | 'formal' | 'playful';
}

interface NavigateToolArgs {
  direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  destination?: string;
  describe_only?: boolean;
}

interface ExamineToolArgs {
  target: string;
  focus?: string;
}

interface UseItemToolArgs {
  item_name: string;
  target?: string;
  action?: string;
}

interface GetNpcMemoryToolArgs {
  npc_id: string;
  memory_type?: 'recent' | 'significant' | 'emotional' | 'all';
  topic?: string;
}

interface UpdateRelationshipToolArgs {
  npc_id: string;
  action_type?: string;
  delta?: number;
  dimension?: AffinityDimension;
  reason?: string;
  milestone_id?: string;
}

interface UpdateProximityToolArgs {
  npc_id: string;
  body_part: string;
  sense_type: SenseType;
  action: ProximityAction;
  new_intensity?: EngagementIntensity;
}

interface AdvanceTimeToolArgs {
  amount: number;
  unit: 'turns' | 'minutes' | 'hours';
  reason?: string;
  skip_type?: 'wait' | 'sleep' | 'activity' | 'travel' | 'automatic';
}

interface MoveToLocationToolArgs {
  destination_id: string;
  destination_name?: string;
  travel_mode?: 'walk' | 'run' | 'sneak' | 'teleport' | 'vehicle';
  time_to_arrive?: number;
}

interface GetLocationInfoToolArgs {
  location_id?: string;
  include_occupancy?: boolean;
  include_exits?: boolean;
}

interface ToolingFailureReportArgs {
  summary: string;
  stage: 'initial' | 'retry' | 'post_tool';
  suspected_cause?: string;
  intended_tool?: string;
  invalid_output_excerpt?: string;
  available_tools?: string[];
  finish_reason?: string;
  notes?: string;
}

interface GetHygieneSensoryToolArgs {
  npc_id: string;
  body_part: string;
  sense_type: 'smell' | 'touch' | 'taste';
}

interface UpdateNpcHygieneToolArgs {
  npc_id: string;
  activity: 'idle' | 'walking' | 'running' | 'labor' | 'combat';
  turns_elapsed?: number;
  footwear?:
    | 'barefoot'
    | 'sandals'
    | 'shoes_with_socks'
    | 'shoes_no_socks'
    | 'boots_heavy'
    | 'boots_sealed';
  environment?: 'dry' | 'humid' | 'rain' | 'swimming';
  cleaned_parts?: string[];
}

// =============================================================================
// Fallback Handler Type
// =============================================================================

/**
 * A fallback handler for tools not handled by the main executor.
 * Returns null if the tool is not recognized, allowing chaining.
 */
export type FallbackToolHandler = (toolCall: ToolCall) => Promise<ToolResult | null>;

// =============================================================================
// Executor Configuration
// =============================================================================

export interface ToolExecutorConfig {
  /** The SensoryAgent instance for sensory tool calls */
  sensoryAgent: SensoryAgent;

  /** The NpcAgent instance for dialogue tool calls */
  npcAgent: NpcAgent;

  /** Hygiene domain service for hygiene-related tools */
  hygieneService: HygieneService;

  /** Tenant/owner scoping for NPC transcript retrieval */
  ownerEmail: string;

  /** Current session ID */
  sessionId: string;

  /** State slices available for this turn */
  stateSlices: AgentStateSlices;

  /** Current proximity state (for update_proximity tool) */
  proximityState?: ProximityState;

  /** Current turn number (for proximity engagement timestamps) */
  currentTurn?: number;

  /** Current time state for advance_time tool */
  timeState?: SessionTimeState;

  /** Time configuration (from setting, defaults to DEFAULT_TIME_CONFIG) */
  timeConfig?: TimeConfig;

  /** Affinity state for NPCs in this session (keyed by NPC ID) */
  affinityStates?: Map<string, CharacterInstanceAffinity>;

  /** NPC location states for this session (keyed by NPC ID) */
  npcLocationStates?: Map<string, NpcLocationState>;

  /** Current player location ID */
  playerLocationId?: string;

  /** Available locations (location ID -> location data) */
  availableLocations?: Map<string, LocationInfo>;

  /** Routed per-turn prompt tag context (optional) */
  turnTagContext?: TurnTagContext;

  /**
   * Optional fallback handler for tools not handled by this executor.
   * Called before returning "Unknown tool" error.
   */
  fallbackHandler?: FallbackToolHandler;
}

/**
 * Location information for the executor.
 */
export interface LocationInfo {
  id: string;
  name: string;
  description?: string;
  exits?: { direction: string; destinationId: string; destinationName?: string }[];
  capacity?: number;
  travelTimeMinutes?: number;
}

// =============================================================================
// Tool Executor
// =============================================================================

/**
 * Executes tool calls by delegating to existing agents.
 *
 * The executor maps tool names to agent methods and transforms
 * the structured tool results for LLM consumption.
 */
export class ToolExecutor {
  private readonly sensoryAgent: SensoryAgent;
  private readonly npcAgent: NpcAgent;
  private readonly hygieneService: HygieneService;
  private readonly ownerEmail: string;
  private readonly sessionId: string;
  private readonly stateSlices: AgentStateSlices;
  private readonly proximityState: ProximityState;
  private readonly currentTurn: number;
  private readonly timeState: SessionTimeState;
  private readonly timeConfig: TimeConfig;
  private readonly affinityStates: Map<string, CharacterInstanceAffinity>;
  private readonly npcLocationStates: Map<string, NpcLocationState>;
  private readonly playerLocationId: string;
  private readonly availableLocations: Map<string, LocationInfo>;
  private readonly turnTagContext: TurnTagContext | undefined;
  private readonly fallbackHandler?: FallbackToolHandler;

  constructor(config: ToolExecutorConfig) {
    this.sensoryAgent = config.sensoryAgent;
    this.npcAgent = config.npcAgent;
    this.hygieneService = config.hygieneService;
    this.ownerEmail = config.ownerEmail;
    this.sessionId = config.sessionId;
    this.stateSlices = config.stateSlices;
    this.proximityState = config.proximityState ?? createDefaultProximityState();
    this.currentTurn = config.currentTurn ?? 1;
    this.timeState = config.timeState ?? createInitialTimeState();
    this.timeConfig = config.timeConfig ?? DEFAULT_TIME_CONFIG;
    this.affinityStates = config.affinityStates ?? new Map<string, CharacterInstanceAffinity>();
    this.npcLocationStates = config.npcLocationStates ?? new Map<string, NpcLocationState>();
    this.playerLocationId = config.playerLocationId ?? '';
    this.availableLocations = config.availableLocations ?? new Map<string, LocationInfo>();
    this.turnTagContext = config.turnTagContext;
    if (config.fallbackHandler) {
      this.fallbackHandler = config.fallbackHandler;
    }
  }

  private renderTagInstructions(instructions: TagInstruction[]): string {
    if (instructions.length === 0) return '';
    return instructions
      .map((t) => {
        const desc = t.shortDescription ? ` - ${t.shortDescription}` : '';
        return `- ${t.tagName}${desc}: ${t.instructionText}`;
      })
      .join('\n');
  }

  /**
   * Execute a tool call and return structured result.
   * Unknown tools return an error result (not thrown).
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    let args: unknown;

    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      return {
        success: false,
        error: `Failed to parse tool arguments: ${toolCall.function.arguments}`,
      };
    }

    switch (toolCall.function.name) {
      // Priority 1: Core tools (fully implemented)
      case 'get_sensory_detail':
        return this.executeSensory(args as SensoryToolArgs);
      case 'npc_dialogue':
        return this.executeNpcDialogue(args as NpcDialogueToolArgs);
      case 'update_proximity':
        return this.executeUpdateProximity(args as UpdateProximityToolArgs);

      // Priority 2: Environment tools (placeholder)
      case 'navigate_player':
        return this.executeNavigate(args as NavigateToolArgs);
      case 'examine_object':
        return this.executeExamine(args as ExamineToolArgs);

      // Priority 3: Inventory tools (placeholder)
      case 'use_item':
        return this.executeUseItem(args as UseItemToolArgs);

      // Priority 4: Time tools (implemented)
      case 'advance_time':
        return this.executeAdvanceTime(args as AdvanceTimeToolArgs);

      // Priority 4.5: Location tools (implemented)
      case 'move_to_location':
        return this.executeMoveToLocation(args as MoveToLocationToolArgs);
      case 'get_location_info':
        return this.executeGetLocationInfo(args as GetLocationInfoToolArgs);

      // Priority 5: Relationship tools (placeholder)
      case 'get_npc_memory':
        return this.executeGetNpcMemory(args as GetNpcMemoryToolArgs);
      case 'update_relationship':
        return this.executeUpdateRelationship(args as UpdateRelationshipToolArgs);

      // Priority 6: Hygiene tools
      case 'get_hygiene_sensory':
        return this.executeGetHygieneSensory(args as GetHygieneSensoryToolArgs);
      case 'update_npc_hygiene':
        return this.executeUpdateNpcHygiene(args as UpdateNpcHygieneToolArgs);

      // Debug: Tooling diagnostics
      case 'tooling_failure_report':
        return this.executeToolingFailureReport(args as ToolingFailureReportArgs);

      default: {
        // Try fallback handler before returning unknown error
        if (this.fallbackHandler) {
          const fallbackResult = await this.fallbackHandler(toolCall);
          if (fallbackResult !== null) {
            return fallbackResult;
          }
        }
        return {
          success: false,
          error: `Unknown tool: ${toolCall.function.name}`,
        };
      }
    }
  }

  /**
   * Debug tool: capture structured diagnostics when tool calling fails.
   * This intentionally produces no state patches.
   */
  private executeToolingFailureReport(args: ToolingFailureReportArgs): ToolResult {
    return {
      success: true,
      report_recorded: true,
      report: args,
      hint: 'Tooling failure report recorded. Now call the appropriate game tool(s) for this turn (for example, npc_dialogue, get_sensory_detail, move_to_location).',
    };
  }

  /**
   * Execute multiple tool calls in parallel.
   * Returns results in the same order as the input calls.
   */
  async executeAll(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    return Promise.all(toolCalls.map((tc) => this.execute(tc)));
  }

  // ===========================================================================
  // Priority 1: Core Tool Handlers (FULLY IMPLEMENTED)
  // ===========================================================================

  /**
   * Execute sensory detail lookup using SensoryAgent.
   * Returns structured sensory context for LLM to weave into narrative.
   * Also returns statePatches to create/update a proximity engagement.
   */
  private async executeSensory(args: SensoryToolArgs): Promise<ToolResult> {
    const agentInput = {
      sessionId: this.sessionId,
      playerInput: '',
      intent: {
        type: args.sense_type,
        confidence: 1.0,
        params: {
          target: args.target,
          bodyPart: args.body_part,
        },
      },
      stateSlices: this.stateSlices,
      knowledgeContext: [],
    };

    try {
      const output = await this.sensoryAgent.execute(agentInput);

      // Check if we got sensory data
      if (!output.sensoryContext || Object.keys(output.sensoryContext.available).length === 0) {
        return {
          success: false,
          error: `No ${args.sense_type} data available for ${args.target}`,
          hint: 'The target may not have sensory data defined',
        };
      }

      // Generate proximity state patch if we have a body part and NPC target
      const statePatches = this.buildSensoryProximityPatches(args);

      // Enrich with hygiene modifiers when applicable
      let hygieneLevel: number | undefined;
      let hygieneModifier: string | undefined;
      let hygieneError: string | undefined;

      const supportsHygiene =
        !!args.body_part &&
        (args.sense_type === 'smell' || args.sense_type === 'touch' || args.sense_type === 'taste');

      if (supportsHygiene) {
        try {
          const bodyPart = args.body_part!;
          const targetId = args.target;
          const senseType = args.sense_type as 'smell' | 'touch' | 'taste';
          const hygiene = await this.hygieneService.getSensoryModifier(
            this.sessionId,
            targetId,
            bodyPart,
            senseType
          );
          hygieneLevel = hygiene.level;
          hygieneModifier = hygiene.modifier;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          hygieneError = `Hygiene lookup failed: ${message}`;
        }
      }

      return {
        success: true,
        sense_type: args.sense_type,
        target: args.target,
        body_part: args.body_part,
        sensory_data: output.sensoryContext.available,
        narrative_hints: output.sensoryContext.narrativeHints,
        ...(hygieneLevel !== undefined
          ? { hygiene_level: hygieneLevel, hygiene_modifier: hygieneModifier }
          : {}),
        ...(hygieneError ? { hygiene_error: hygieneError } : {}),
        ...(statePatches ? { statePatches } : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Sensory agent failed: ${message}`,
      };
    }
  }

  /**
   * Build proximity state patches for a sensory engagement.
   * Creates or updates an engagement entry in the proximity state.
   */
  private buildSensoryProximityPatches(args: SensoryToolArgs): StatePatches | undefined {
    // Need both body part and a valid sense type to create engagement
    if (!args.body_part) {
      return undefined;
    }

    // Map tool sense type to schema sense type
    const senseTypeMap: Record<string, SenseType> = {
      smell: 'smell',
      touch: 'touch',
      taste: 'taste',
      look: 'look',
      listen: 'hear',
    };
    const senseType = senseTypeMap[args.sense_type];
    if (!senseType) {
      return undefined;
    }

    // Use target as NPC ID (may need normalization in future)
    const npcId = args.target.toLowerCase();
    const engagementKey = makeEngagementKey(npcId, args.body_part, senseType);

    // Check if engagement already exists
    const existingEngagement = this.proximityState.engagements[engagementKey];

    if (existingEngagement) {
      // Update lastActiveAt for existing engagement
      return {
        proximity: [
          {
            op: 'replace',
            path: `/engagements/${engagementKey}/lastActiveAt`,
            value: this.currentTurn,
          },
        ],
      };
    }

    // Create new engagement
    const engagement: SensoryEngagement = {
      npcId,
      bodyPart: args.body_part,
      senseType,
      intensity: 'focused', // Default to focused for explicit sensory action
      startedAt: this.currentTurn,
      lastActiveAt: this.currentTurn,
    };

    return {
      proximity: [
        {
          op: 'add',
          path: `/engagements/${engagementKey}`,
          value: engagement,
        },
      ],
    };
  }

  /**
   * Execute NPC dialogue context retrieval.
   * Returns character state and context for LLM to generate dialogue.
   *
   * Note: This returns NPC context data, not generated dialogue.
   * The LLM uses this context to write the actual dialogue.
   */
  private async executeNpcDialogue(args: NpcDialogueToolArgs): Promise<ToolResult> {
    const npc = this.stateSlices.npc ?? this.stateSlices.character;
    const npcId = args.npc_id;

    if (!npc) {
      return {
        success: false,
        error: `NPC "${args.npc_id}" not found`,
        available_npcs: [], // TODO: list available NPCs from session
      };
    }

    // Extract personality context for LLM compatibility/debugging
    const personalityContext: Record<string, unknown> = {};

    if (npc.personalityMap) {
      const pm = npc.personalityMap;
      if (pm.speech) {
        personalityContext['speech_style'] = pm.speech;
      }
      if (pm.emotionalBaseline) {
        personalityContext['emotional_baseline'] = pm.emotionalBaseline;
      }
      if (pm.values && pm.values.length > 0) {
        personalityContext['core_values'] = pm.values.slice(0, 3).map((v) => v.value);
      }
    }

    if (npc.personality) {
      personalityContext['traits'] = Array.isArray(npc.personality)
        ? npc.personality
        : [npc.personality];
    }

    const npcTagInstructions =
      this.turnTagContext?.byNpcInstanceId?.[npcId] ?? ([] as TagInstruction[]);
    const locationTagInstructions = this.turnTagContext?.playerLocationId
      ? (this.turnTagContext.byLocationId?.[this.turnTagContext.playerLocationId] ??
        ([] as TagInstruction[]))
      : ([] as TagInstruction[]);

    const proximityLevel: ProximityLevel | undefined = this.proximityState.npcProximity?.[npcId];
    const npcTags = npcTagInstructions.map((t) => t.tagName);
    const locationTags = locationTagInstructions.map((t) => t.tagName);
    const sessionTags = this.turnTagContext?.session?.map((t) => t.tagName) ?? [];

    const isDirectlyAddressed =
      typeof args.player_utterance === 'string' && typeof npc.name === 'string'
        ? args.player_utterance.toLowerCase().includes(npc.name.toLowerCase())
        : false;

    const stateSlicesSnapshot = cloneJsonLike(this.stateSlices);

    const npcInput: NpcAgentInput = {
      sessionId: this.sessionId,
      playerInput: args.player_utterance,
      npcId,
      intent: { type: 'talk', params: { npcId, target: npc.name }, confidence: 1 },
      stateSlices: stateSlicesSnapshot,
      isDirectlyAddressed,
      npcTags,
      locationTags,
      sessionTags,
      ownerEmail: this.ownerEmail,
      ...(proximityLevel !== undefined ? { proximityLevel } : {}),
    };

    try {
      const output = await this.npcAgent.execute(npcInput);
      const statePatches: StatePatches | undefined = output.statePatches
        ? { state: output.statePatches }
        : undefined;

      return {
        success: true,
        npc_id: npcId,
        npc_name: npc.name,
        npc_summary: npc.backstory?.slice(0, 200),
        personality: personalityContext,
        narrative: output.narrative,
        npc_priority: output.npcPriority,
        is_directly_addressed: isDirectlyAddressed,
        proximity_level: proximityLevel,
        npc_tags_count: npcTags.length,
        location_tags_count: locationTags.length,
        session_tags_count: sessionTags.length,
        interaction_type: args.interaction_type ?? 'speech',
        suggested_tone: args.tone ?? 'neutral',
        current_mood: 'neutral',
        ...(statePatches ? { statePatches } : {}),
        ...(output.events ? { events: output.events } : {}),
        ...(output.diagnostics ? { diagnostics: output.diagnostics } : {}),
        npc_tag_instructions:
          npcTagInstructions.length > 0
            ? this.renderTagInstructions(npcTagInstructions)
            : undefined,
        location_tag_instructions:
          locationTagInstructions.length > 0
            ? this.renderTagInstructions(locationTagInstructions)
            : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `NPC dialogue failed: ${message}`,
      };
    }
  }

  // ===========================================================================
  // Priority 2: Environment Tool Handlers (PLACEHOLDER)
  // ===========================================================================

  /**
   * PLACEHOLDER: Navigate player to new location.
   * Will wrap MapAgent when implemented.
   */
  private executeNavigate(args: NavigateToolArgs): ToolResult {
    const location = this.stateSlices.location;

    if (args.describe_only || (!args.direction && !args.destination)) {
      return {
        success: true,
        action: 'describe_exits',
        current_location: location?.name ?? 'Unknown',
        available_exits: location?.exits ?? [],
        description: location?.description ?? 'You are somewhere.',
      };
    }

    // Placeholder movement response
    return {
      success: false,
      error: 'Navigation not yet implemented',
      requested_direction: args.direction,
      requested_destination: args.destination,
      hint: 'MapAgent integration pending',
    };
  }

  /**
   * PLACEHOLDER: Examine object or area in detail.
   * Will provide rich descriptions from location/object data.
   */
  private executeExamine(args: ExamineToolArgs): ToolResult {
    // Check if examining an NPC
    const npc = this.stateSlices.npc ?? this.stateSlices.character;
    if (npc && args.target.toLowerCase().includes(npc.name.toLowerCase())) {
      return {
        success: true,
        target: npc.name,
        target_type: 'character',
        description: npc.backstory ?? `You see ${npc.name}.`,
        notable_features: [], // TODO: extract from appearance
        focus: args.focus,
      };
    }

    // Placeholder for other objects
    return {
      success: false,
      error: `Cannot examine "${args.target}"`,
      hint: 'Object examination not yet implemented',
    };
  }

  // ===========================================================================
  // Priority 3: Inventory Tool Handlers (PLACEHOLDER)
  // ===========================================================================

  /**
   * PLACEHOLDER: Use item from inventory.
   * Will integrate with inventory state management.
   */
  private executeUseItem(args: UseItemToolArgs): ToolResult {
    const inventory = this.stateSlices.inventory;

    // Get items from inventory if available
    const items = inventory?.items ?? [];
    if (items.length > 0) {
      const hasItem = items.some((i) =>
        i.name.toLowerCase().includes(args.item_name.toLowerCase())
      );

      if (!hasItem) {
        return {
          success: false,
          error: `You don't have "${args.item_name}"`,
          available_items: items.map((i) => i.name),
        };
      }
    }

    // Placeholder success
    return {
      success: false,
      error: 'Item use not yet implemented',
      item: args.item_name,
      target: args.target,
      hint: 'Inventory system integration pending',
    };
  }

  // ===========================================================================
  // Proximity Tool Handler (FULLY IMPLEMENTED)
  // ===========================================================================

  /**
   * Execute proximity state update.
   * Uses ProximityManager to generate state patches for engagement changes.
   */
  private executeUpdateProximity(args: UpdateProximityToolArgs): ToolResult {
    // Build params, only including newIntensity if defined
    const params: Parameters<typeof ProximityManager.updateEngagement>[1] = {
      npcId: args.npc_id,
      bodyPart: args.body_part,
      senseType: args.sense_type,
      action: args.action,
      currentTurn: this.currentTurn,
    };
    if (args.new_intensity !== undefined) {
      params.newIntensity = args.new_intensity;
    }

    const result = ProximityManager.updateEngagement(this.proximityState, params);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? 'Unknown error',
        hint: result.description,
      };
    }

    // Build state patches for the proximity slice
    const statePatches: StatePatches =
      result.patches.length > 0 ? { proximity: result.patches } : {};

    return {
      success: true,
      action: args.action,
      npc_id: args.npc_id,
      body_part: args.body_part,
      sense_type: args.sense_type,
      new_intensity: args.new_intensity,
      engagement_key: makeEngagementKey(args.npc_id, args.body_part, args.sense_type),
      description: result.description,
      statePatches,
    };
  }

  // ===========================================================================
  // Priority 4: Time Tool Handler (IMPLEMENTED)
  // ===========================================================================

  /**
   * Execute time advancement.
   * Advances game time and returns the new state with any triggered events.
   * Produces state patches for the time slice.
   */
  private executeAdvanceTime(args: AdvanceTimeToolArgs): ToolResult {
    // Convert requested time to seconds
    let seconds: number;
    switch (args.unit) {
      case 'turns':
        seconds = args.amount * this.timeConfig.secondsPerTurn;
        break;
      case 'minutes':
        seconds = args.amount * 60;
        break;
      case 'hours':
        seconds = args.amount * 3600;
        break;
      default:
        return {
          success: false,
          error: `Unknown time unit: ${String((args as { unit?: unknown }).unit)}`,
        };
    }

    // Validate the time skip (check against max skip hours)
    const validation = validateTimeSkip(seconds, this.timeConfig);
    if (!validation.allowed) {
      return {
        success: false,
        error: validation.rejectionMessage ?? 'Time skip too long',
        requested_hours: validation.requestedHours,
        max_allowed_hours: validation.maxAllowedHours,
        hint: 'Try a smaller time skip',
      };
    }

    // Calculate turns from seconds for the tick function
    const turns = Math.ceil(seconds / this.timeConfig.secondsPerTurn);

    // Perform the time tick
    const tickResult: TickResult = tick(
      this.timeState.current,
      this.timeConfig,
      turns,
      this.timeState.pendingTimeEvents
    );

    // Update the time state
    const newTimeState = updateTimeStateFromTick(this.timeState, tickResult, turns);

    // Build state patches for the time slice
    const timePatches: Operation[] = [
      {
        op: 'replace',
        path: '/current',
        value: newTimeState.current,
      },
      {
        op: 'replace',
        path: '/totalTurns',
        value: newTimeState.totalTurns,
      },
      {
        op: 'replace',
        path: '/lastActiveAt',
        value: newTimeState.lastActiveAt,
      },
      {
        op: 'replace',
        path: '/currentPeriod',
        value: newTimeState.currentPeriod,
      },
    ];

    // Add pending events patch if they changed
    if (tickResult.triggeredEvents && tickResult.triggeredEvents.length > 0) {
      timePatches.push({
        op: 'replace',
        path: '/pendingTimeEvents',
        value: newTimeState.pendingTimeEvents ?? [],
      });
    }

    const statePatches: StatePatches = { time: timePatches };

    return {
      success: true,
      previous_time: formatGameTime(tickResult.previousTime, this.timeConfig),
      new_time: formatGameTime(tickResult.newTime, this.timeConfig),
      time_advanced: {
        amount: args.amount,
        unit: args.unit,
        seconds,
        turns,
      },
      period_changed: tickResult.periodChanged,
      new_period: tickResult.newPeriod?.name,
      new_period_description: tickResult.newPeriod?.description,
      day_changed: tickResult.dayChanged,
      triggered_events: tickResult.triggeredEvents?.map((e) => ({
        id: e.id,
        event_type: e.eventType,
        payload: e.payload,
      })),
      reason: args.reason,
      skip_type: args.skip_type ?? 'automatic',
      statePatches,
    };
  }

  // ===========================================================================
  // Priority 4.5: Location Tool Handlers (IMPLEMENTED)
  // ===========================================================================

  /**
   * Execute move to location.
   * Updates player location and computes occupancy at the new location.
   * Returns state patches for the location slice.
   */
  private executeMoveToLocation(args: MoveToLocationToolArgs): ToolResult {
    const destinationId = args.destination_id;

    // Validate destination exists
    const destination = this.availableLocations.get(destinationId);
    if (!destination) {
      // Try to find by name if ID not found
      const byName = Array.from(this.availableLocations.values()).find(
        (loc) =>
          args.destination_name &&
          loc.name.toLowerCase().includes(args.destination_name.toLowerCase())
      );

      if (!byName) {
        return {
          success: false,
          error: `Unknown destination: ${destinationId}`,
          hint: 'Use a valid location ID from the setting',
          available_locations: Array.from(this.availableLocations.values())
            .slice(0, 10)
            .map((loc) => ({ id: loc.id, name: loc.name })),
        };
      }

      // Use the found location
      return this.executeMoveToLocation({ ...args, destination_id: byName.id });
    }

    // Check if already at destination
    if (this.playerLocationId === destinationId) {
      return {
        success: true,
        already_there: true,
        location_id: destinationId,
        location_name: destination.name,
        message: `You are already at ${destination.name}.`,
      };
    }

    // Get previous location for travel time calculation
    const previousLocation = this.availableLocations.get(this.playerLocationId);
    const previousLocationName = previousLocation?.name ?? 'your previous location';

    // Calculate travel time (use provided time or estimate from location data)
    let travelMinutes = args.time_to_arrive ?? destination.travelTimeMinutes ?? 5;

    // Adjust for travel mode
    switch (args.travel_mode) {
      case 'run':
        travelMinutes = Math.ceil(travelMinutes * 0.5);
        break;
      case 'sneak':
        travelMinutes = Math.ceil(travelMinutes * 1.5);
        break;
      case 'teleport':
        travelMinutes = 0;
        break;
      case 'vehicle':
        travelMinutes = Math.ceil(travelMinutes * 0.25);
        break;
      // 'walk' is default
    }

    // Get NPCs at the new location
    const npcsAtDestination: { npcId: string; activity: string; interruptible: boolean }[] = [];
    for (const [npcId, npcState] of this.npcLocationStates) {
      if (npcState.locationId === destinationId) {
        npcsAtDestination.push({
          npcId,
          activity: npcState.activity.description,
          interruptible: npcState.interruptible,
        });
      }
    }

    // Calculate crowd level
    const crowdLevel = categorizeCrowdLevel(npcsAtDestination.length, destination.capacity);

    // Build state patches for the location slice
    const locationPatches: Operation[] = [
      {
        op: 'replace',
        path: '/playerLocationId',
        value: destinationId,
      },
      {
        op: 'replace',
        path: '/previousLocationId',
        value: this.playerLocationId,
      },
    ];

    const statePatches: StatePatches = { location: locationPatches };

    return {
      success: true,
      moved: true,
      from_location: {
        id: this.playerLocationId,
        name: previousLocationName,
      },
      to_location: {
        id: destinationId,
        name: destination.name,
        description: destination.description,
      },
      travel_mode: args.travel_mode ?? 'walk',
      travel_time_minutes: travelMinutes,
      npcs_present: npcsAtDestination,
      crowd_level: crowdLevel,
      exits: destination.exits ?? [],
      statePatches,
    };
  }

  /**
   * Execute get location info.
   * Returns information about a location including occupancy.
   */
  private executeGetLocationInfo(args: GetLocationInfoToolArgs): ToolResult {
    const locationId = args.location_id ?? this.playerLocationId;

    if (!locationId) {
      return {
        success: false,
        error: 'No location specified and player location unknown',
        hint: 'Provide a location_id or ensure player location is set',
      };
    }

    const location = this.availableLocations.get(locationId);
    if (!location) {
      return {
        success: false,
        error: `Unknown location: ${locationId}`,
        hint: 'Use a valid location ID from the setting',
      };
    }

    const includeOccupancy = args.include_occupancy !== false;
    const includeExits = args.include_exits !== false;

    // Get NPCs at this location if requested
    const npcsPresent: { npcId: string; activity: string; interruptible: boolean }[] = [];
    let crowdLevel: CrowdLevel = 'empty';

    if (includeOccupancy) {
      for (const [npcId, npcState] of this.npcLocationStates) {
        if (npcState.locationId === locationId) {
          npcsPresent.push({
            npcId,
            activity: npcState.activity.description,
            interruptible: npcState.interruptible,
          });
        }
      }
      crowdLevel = categorizeCrowdLevel(npcsPresent.length, location.capacity);
    }

    const result: ToolResult = {
      success: true,
      location_id: locationId,
      location_name: location.name,
      description: location.description,
      is_current_location: locationId === this.playerLocationId,
    };

    if (includeOccupancy) {
      result['npcs_present'] = npcsPresent;
      result['crowd_level'] = crowdLevel;
    }

    if (includeExits) {
      result['exits'] = location.exits ?? [];
    }

    if (location.capacity) {
      result['capacity'] = location.capacity;
    }

    return result;
  }

  // ===========================================================================
  // Priority 5: Relationship Tool Handlers (IMPLEMENTED)
  // ===========================================================================

  /**
   * PLACEHOLDER: Retrieve NPC memories of player.
   * Will query relationship/memory storage.
   */
  private executeGetNpcMemory(args: GetNpcMemoryToolArgs): ToolResult {
    // Get affinity state for this NPC
    const affinityState = this.affinityStates.get(args.npc_id);

    if (!affinityState) {
      return {
        success: true,
        npc_id: args.npc_id,
        memory_type: args.memory_type ?? 'all',
        memories: [],
        relationship_level: 'neutral',
        hint: 'No established relationship yet',
      };
    }

    // Build affinity context which includes relationship insights
    const context = buildAffinityContext(affinityState.scores);

    return {
      success: true,
      npc_id: args.npc_id,
      memory_type: args.memory_type ?? 'all',
      relationship_level: affinityState.relationshipLevel,
      insights: context.insights,
      milestones: affinityState.milestones,
      recent_actions: affinityState.actionHistory.slice(-5).map((h) => ({
        action: h.actionType,
        count: h.count,
      })),
    };
  }

  /**
   * Update NPC relationship with player.
   * Applies affinity effects based on action types or direct delta changes.
   * Returns state patches for the affinity slice.
   */
  private executeUpdateRelationship(args: UpdateRelationshipToolArgs): ToolResult {
    // Get or create affinity state for this NPC
    let affinityState = this.affinityStates.get(args.npc_id);
    const isNewRelationship = !affinityState;

    affinityState ??= createCharacterInstanceAffinity(true); // Include attraction

    let newScores = { ...affinityState.scores };
    const appliedEffects: { dimension: string; change: number }[] = [];

    // Apply action-type based effects
    if (args.action_type) {
      const effects = AFFINITY_EFFECTS[args.action_type];
      if (effects) {
        for (const effect of effects) {
          const oldValue = newScores[effect.dimension] ?? 0;
          newScores = applyAffinityEffect(newScores, effect);
          const newValue = newScores[effect.dimension] ?? 0;
          appliedEffects.push({
            dimension: effect.dimension,
            change: newValue - oldValue,
          });
        }
      } else {
        return {
          success: false,
          error: `Unknown action type: ${args.action_type}`,
          npc_id: args.npc_id,
          available_actions: Object.keys(AFFINITY_EFFECTS).slice(0, 10),
          hint: 'Use a known action type or specify dimension and delta directly',
        };
      }
    }

    // Apply direct delta change if provided
    if (args.delta !== undefined && args.dimension) {
      const effect: AffinityEffect = {
        dimension: args.dimension,
        baseChange: args.delta,
      };
      const oldValue = newScores[args.dimension] ?? 0;
      newScores = applyAffinityEffect(newScores, effect);
      const newValue = newScores[args.dimension] ?? 0;
      appliedEffects.push({
        dimension: args.dimension,
        change: newValue - oldValue,
      });
    }

    // Calculate new disposition
    const newDisposition = calculateDisposition(newScores);
    const previousLevel = affinityState.relationshipLevel;
    const levelChanged = previousLevel !== newDisposition.level;

    // Update affinity state
    const newAffinityState: CharacterInstanceAffinity = {
      scores: newScores,
      lastUpdated: new Date().toISOString(),
      actionHistory: args.action_type
        ? this.updateActionHistory(affinityState.actionHistory, args.action_type)
        : affinityState.actionHistory,
      milestones: args.milestone_id
        ? [...affinityState.milestones, args.milestone_id]
        : affinityState.milestones,
      relationshipLevel: newDisposition.level,
    };

    // Build state patches
    const statePatches: StatePatches = {
      affinity: [
        {
          op: isNewRelationship ? 'add' : 'replace',
          path: `/${args.npc_id}`,
          value: newAffinityState,
        },
      ],
    };

    // Build context for LLM
    const context = buildAffinityContext(newScores);

    return {
      success: true,
      npc_id: args.npc_id,
      action_type: args.action_type,
      reason: args.reason,
      effects_applied: appliedEffects,
      new_scores: {
        fondness: newScores.fondness,
        trust: newScores.trust,
        respect: newScores.respect,
        comfort: newScores.comfort,
        attraction: newScores.attraction,
        fear: newScores.fear,
      },
      disposition: {
        level: newDisposition.level,
        overall_score: newDisposition.overallScore,
        modifiers: newDisposition.modifiers,
      },
      level_changed: levelChanged,
      previous_level: levelChanged ? previousLevel : undefined,
      insights: context.insights,
      statePatches,
    };
  }

  /**
   * Update action history with a new action occurrence.
   */
  private updateActionHistory(
    history: CharacterInstanceAffinity['actionHistory'],
    actionType: string
  ): CharacterInstanceAffinity['actionHistory'] {
    const existing = history.find((h) => h.actionType === actionType);

    if (existing) {
      // Update existing entry
      return history.map((h) =>
        h.actionType === actionType
          ? { ...h, count: h.count + 1, lastOccurred: this.timeState.current }
          : h
      );
    }

    // Add new entry
    return [
      ...history,
      {
        actionType,
        count: 1,
        lastOccurred: this.timeState.current,
      },
    ];
  }

  // ===========================================================================
  // Priority 6: Hygiene Tool Handlers (IMPLEMENTED)
  // ===========================================================================

  /**
   * Retrieve hygiene-driven sensory modifier for a specific body part and sense.
   * Returns current hygiene level alongside descriptive modifier text.
   */
  private async executeGetHygieneSensory(args: GetHygieneSensoryToolArgs): Promise<ToolResult> {
    try {
      const { level, modifier } = await this.hygieneService.getSensoryModifier(
        this.sessionId,
        args.npc_id,
        args.body_part,
        args.sense_type
      );

      return {
        success: true,
        npc_id: args.npc_id,
        body_part: args.body_part,
        sense_type: args.sense_type,
        hygiene_level: level,
        hygiene_modifier: modifier,
        ...(modifier ? {} : { hint: 'No hygiene modifier found for this body part' }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Hygiene lookup failed: ${message}`,
      };
    }
  }

  /**
   * Update hygiene state based on recent activity and optional cleaning.
   * Persists the change and returns state patches for the hygiene slice.
   */
  private async executeUpdateNpcHygiene(args: UpdateNpcHygieneToolArgs): Promise<ToolResult> {
    try {
      const result = await this.hygieneService.update(this.sessionId, {
        npcId: args.npc_id,
        turnsElapsed: args.turns_elapsed ?? 1,
        activity: args.activity,
        footwear: args.footwear,
        environment: args.environment,
        cleanedParts: args.cleaned_parts,
      });

      const statePatches: StatePatches = {
        hygiene: [
          {
            op: 'add',
            path: `/${args.npc_id}`,
            value: result.state,
          },
        ],
      };

      return {
        success: true,
        npc_id: args.npc_id,
        activity: args.activity,
        turns_elapsed: args.turns_elapsed ?? 1,
        cleaned_parts: args.cleaned_parts,
        environment: args.environment,
        footwear: args.footwear,
        hygiene_state: result.state,
        updated_body_parts: Object.keys(result.state.bodyParts),
        statePatches,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Hygiene update failed: ${message}`,
      };
    }
  }
}

/**
 * Factory function to create a ToolExecutor with the given configuration.
 */
export function createToolExecutor(config: ToolExecutorConfig): ToolExecutor {
  return new ToolExecutor(config);
}
