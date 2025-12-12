/**
 * Tool Executor - Executes tool calls using existing agents.
 *
 * This class bridges LLM tool calls to existing agent implementations.
 * It parses tool arguments, calls the appropriate agent, and returns
 * structured results for the LLM to weave into narrative.
 */
import type { ToolCall, ToolResult, StatePatches } from './types.js';
import type { SensoryAgent, NpcAgent } from '@minimal-rpg/agents';
import type { AgentStateSlices } from '@minimal-rpg/agents';
import type {
  ProximityState,
  ProximityAction,
  SenseType,
  EngagementIntensity,
  SensoryEngagement,
} from '@minimal-rpg/schemas';
import { createDefaultProximityState, makeEngagementKey } from '@minimal-rpg/schemas';
import { ProximityManager } from '../proximity/index.js';

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
  delta?: number;
  reason?: string;
  flags?: string[];
}

interface UpdateProximityToolArgs {
  npc_id: string;
  body_part: string;
  sense_type: SenseType;
  action: ProximityAction;
  new_intensity?: EngagementIntensity;
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

  /** Current session ID */
  sessionId: string;

  /** State slices available for this turn */
  stateSlices: AgentStateSlices;

  /** Current proximity state (for update_proximity tool) */
  proximityState?: ProximityState;

  /** Current turn number (for proximity engagement timestamps) */
  currentTurn?: number;

  /**
   * Optional fallback handler for tools not handled by this executor.
   * Called before returning "Unknown tool" error.
   */
  fallbackHandler?: FallbackToolHandler;
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
  private readonly sessionId: string;
  private readonly stateSlices: AgentStateSlices;
  private readonly proximityState: ProximityState;
  private readonly currentTurn: number;
  private readonly fallbackHandler?: FallbackToolHandler;

  constructor(config: ToolExecutorConfig) {
    this.sensoryAgent = config.sensoryAgent;
    this.npcAgent = config.npcAgent;
    this.sessionId = config.sessionId;
    this.stateSlices = config.stateSlices;
    this.proximityState = config.proximityState ?? createDefaultProximityState();
    this.currentTurn = config.currentTurn ?? 1;
    if (config.fallbackHandler) {
      this.fallbackHandler = config.fallbackHandler;
    }
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

      // Priority 4: Relationship tools (placeholder)
      case 'get_npc_memory':
        return this.executeGetNpcMemory(args as GetNpcMemoryToolArgs);
      case 'update_relationship':
        return this.executeUpdateRelationship(args as UpdateRelationshipToolArgs);

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

      return {
        success: true,
        sense_type: args.sense_type,
        target: args.target,
        body_part: args.body_part,
        sensory_data: output.sensoryContext.available,
        narrative_hints: output.sensoryContext.narrativeHints,
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
  private executeNpcDialogue(args: NpcDialogueToolArgs): ToolResult {
    const npc = this.stateSlices.npc ?? this.stateSlices.character;

    if (!npc) {
      return {
        success: false,
        error: `NPC "${args.npc_id}" not found`,
        available_npcs: [], // TODO: list available NPCs from session
      };
    }

    // Extract personality context for LLM
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

    return {
      success: true,
      npc_id: args.npc_id,
      npc_name: npc.name,
      npc_summary: npc.backstory?.slice(0, 200), // Truncate for context
      personality: personalityContext,
      player_utterance: args.player_utterance,
      interaction_type: args.interaction_type ?? 'speech',
      suggested_tone: args.tone ?? 'neutral',
      // Current mood could come from session state in future
      current_mood: 'neutral',
    };
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
  // Priority 4: Relationship Tool Handlers (PLACEHOLDER)
  // ===========================================================================

  /**
   * PLACEHOLDER: Retrieve NPC memories of player.
   * Will query relationship/memory storage.
   */
  private executeGetNpcMemory(args: GetNpcMemoryToolArgs): ToolResult {
    return {
      success: false,
      error: 'NPC memory system not yet implemented',
      npc_id: args.npc_id,
      memory_type: args.memory_type,
      hint: 'Memory retrieval pending relationship system',
    };
  }

  /**
   * PLACEHOLDER: Update NPC relationship with player.
   * Will modify relationship state.
   */
  private executeUpdateRelationship(args: UpdateRelationshipToolArgs): ToolResult {
    return {
      success: false,
      error: 'Relationship system not yet implemented',
      npc_id: args.npc_id,
      requested_delta: args.delta,
      hint: 'Relationship updates pending relationship system',
    };
  }
}

/**
 * Factory function to create a ToolExecutor with the given configuration.
 */
export function createToolExecutor(config: ToolExecutorConfig): ToolExecutor {
  return new ToolExecutor(config);
}
