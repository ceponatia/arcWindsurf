/**
 * Tool-Based Turn Handler
 *
 * This handler uses LLM tool calling instead of rule-based intent detection.
 * The LLM intelligently decides when to call tools based on context:
 *
 * - "He looks at Taylor's face" → may call get_sensory_detail(look, Taylor, face)
 * - "He looks up hopefully" → generates narrative directly, no tool needed
 * - "He sniffs her hair" → calls get_sensory_detail(smell, Taylor, hair)
 *
 * The key insight: third-person narrative writing is the user's style.
 * The LLM must understand context to decide if a tool is needed.
 */
import type { Operation } from 'fast-json-patch';
import type {
  TurnInput,
  TurnResult,
  TurnEvent,
  TurnMetadata,
  PhaseTiming,
  TurnStateChanges,
} from './types.js';
import type {
  ToolCall,
  ToolDefinition,
  ToolResult,
  StatePatches,
  ChatMessageWithTools,
  OpenRouterToolResponse,
} from '../tools/types.js';
import type { ToolExecutor } from '../tools/executor.js';
import type { AgentStateSlices } from '@minimal-rpg/agents';
import type { ProximityState, SensoryEngagement } from '@minimal-rpg/schemas';
import { getActiveTools } from '../tools/definitions.js';

// =============================================================================
// Configuration
// =============================================================================

export interface ToolTurnHandlerConfig {
  /** Function to call OpenRouter with tools */
  chatWithTools: (opts: ChatWithToolsRequest) => Promise<OpenRouterToolResponse>;

  /** OpenRouter API key */
  apiKey: string;

  /** Model to use for tool calling */
  model: string;

  /** Tool executor for handling tool calls */
  toolExecutor: ToolExecutor;

  /** Session ID for the current turn */
  sessionId: string;

  /** State slices for context */
  stateSlices: AgentStateSlices;

  /** Current proximity state for sensory engagement tracking */
  proximityState?: ProximityState;

  /** Current turn number (for proximity timestamps) */
  currentTurn?: number;

  /** Maximum tool call iterations (prevents infinite loops) */
  maxToolIterations?: number;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** Additional tool definitions to include alongside core tools */
  additionalTools?: ToolDefinition[];

  /** Enable debug logging */
  debug?: boolean;
}

interface ChatWithToolsRequest {
  apiKey: string;
  model: string;
  messages: ChatMessageWithTools[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | 'required';
  timeoutMs?: number;
  options?: {
    temperature?: number;
    max_tokens?: number;
  };
}

// =============================================================================
// Tool-Based Turn Handler
// =============================================================================

/**
 * Handles player turns using LLM tool calling.
 *
 * Unlike the rule-based intent detector, this handler lets the LLM
 * decide when tools are needed based on context. The LLM can:
 *
 * 1. Generate narrative directly (no tools) for simple scenes
 * 2. Call a single tool for focused actions
 * 3. Call multiple tools for compound actions
 */
export class ToolBasedTurnHandler {
  private readonly chatWithTools: (opts: ChatWithToolsRequest) => Promise<OpenRouterToolResponse>;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly toolExecutor: ToolExecutor;
  private readonly sessionId: string;
  private readonly stateSlices: AgentStateSlices;
  private readonly proximityState: ProximityState;
  private readonly currentTurn: number;
  private readonly maxToolIterations: number;
  private readonly timeoutMs: number;
  private readonly additionalTools: ToolDefinition[];
  private readonly debug: boolean;

  constructor(config: ToolTurnHandlerConfig) {
    this.chatWithTools = config.chatWithTools;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.toolExecutor = config.toolExecutor;
    this.sessionId = config.sessionId;
    this.stateSlices = config.stateSlices;
    this.proximityState = config.proximityState ?? { engagements: {}, npcProximity: {} };
    this.currentTurn = config.currentTurn ?? 1;
    this.maxToolIterations = config.maxToolIterations ?? 5;
    this.timeoutMs = config.timeoutMs ?? 60000;
    this.additionalTools = config.additionalTools ?? [];
    this.debug = config.debug ?? false;
  }

  /**
   * Handle a player turn with tool calling.
   */
  async handleTurn(input: TurnInput): Promise<TurnResult> {
    const startTime = Date.now();
    const phaseTiming: PhaseTiming = {};
    const events: TurnEvent[] = [];
    const toolCallsMade: ToolCall[] = [];
    const accumulatedPatches: StatePatches = {};

    events.push({
      type: 'turn-started',
      timestamp: new Date(),
      payload: { sessionId: input.sessionId, mode: 'tool-calling' },
    });

    if (this.debug) {
      console.log(`[ToolTurnHandler] Starting turn: "${input.playerInput}"`);
    }

    try {
      // 1. Build initial messages with system prompt
      const contextStart = Date.now();
      const messages = this.buildInitialMessages(input);
      const tools = [...getActiveTools(), ...this.additionalTools];
      phaseTiming.contextRetrievalMs = Date.now() - contextStart;

      // 2. Call LLM with tools
      const executionStart = Date.now();
      let response: OpenRouterToolResponse = await this.callLLMWithTools(messages, tools);

      if (response.error) {
        throw new Error(`LLM error: ${response.error}`);
      }

      // 3. Tool execution loop
      let iterations = 0;
      while (response.tool_calls && response.tool_calls.length > 0) {
        if (iterations >= this.maxToolIterations) {
          console.warn(`[ToolTurnHandler] Max tool iterations (${this.maxToolIterations}) reached`);
          break;
        }

        // Extract tool calls with proper typing
        const currentToolCalls: ToolCall[] = response.tool_calls;

        if (this.debug) {
          console.log(
            `[ToolTurnHandler] Executing ${currentToolCalls.length} tool(s), iteration ${iterations + 1}`
          );
        }

        for (const toolCall of currentToolCalls) {
          toolCallsMade.push(toolCall);

          events.push({
            type: 'tool-called',
            timestamp: new Date(),
            payload: { tool: toolCall.function.name, args: toolCall.function.arguments },
          });

          // Execute tool
          const result: ToolResult = await this.toolExecutor.execute(toolCall);

          // Collect state patches from tool result
          if (result.statePatches) {
            this.mergeStatePatches(accumulatedPatches, result.statePatches);

            if (this.debug) {
              const sliceKeys = Object.keys(result.statePatches);
              console.log(
                `[ToolTurnHandler] Collected patches for slices: ${sliceKeys.join(', ')}`
              );
            }
          }

          events.push({
            type: 'tool-result',
            timestamp: new Date(),
            payload: {
              tool: toolCall.function.name,
              success: result.success,
              hasPatches: !!result.statePatches,
            },
          });

          // Add assistant's tool call to messages
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [toolCall],
          });

          // Add tool result to messages (exclude statePatches for LLM)
          const resultForLLM = { ...result };
          delete resultForLLM['statePatches'];
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(resultForLLM),
          });
        }

        // Get next response (may have more tool calls or final answer)
        response = await this.callLLMWithTools(messages, tools);

        if (response.error) {
          throw new Error(`LLM error during tool loop: ${response.error}`);
        }

        iterations++;
      }

      phaseTiming.agentExecutionMs = Date.now() - executionStart;

      // 4. Flatten accumulated patches for state changes
      const stateUpdateStart = Date.now();
      const flatPatches = this.flattenStatePatches(accumulatedPatches);
      const stateChanges: TurnStateChanges | undefined =
        flatPatches.length > 0
          ? {
              patchCount: flatPatches.length,
              modifiedPaths: this.extractModifiedPaths(flatPatches),
              patches: flatPatches,
            }
          : undefined;
      phaseTiming.stateUpdateMs = Date.now() - stateUpdateStart;

      // 5. Extract final narrative
      const narrative = response.message?.content ?? 'Nothing happens.';

      if (this.debug) {
        console.log(`[ToolTurnHandler] Final narrative: ${narrative.substring(0, 100)}...`);
        if (stateChanges) {
          console.log(`[ToolTurnHandler] State patches collected: ${stateChanges.patchCount}`);
        }
      }

      events.push({
        type: 'turn-completed',
        timestamp: new Date(),
        payload: {
          success: true,
          processingTimeMs: Date.now() - startTime,
          toolCalls: toolCallsMade.length,
          patchesCollected: flatPatches.length,
        },
      });

      const metadata: TurnMetadata = {
        processingTimeMs: Date.now() - startTime,
        agentsInvoked: this.extractAgentTypes(toolCallsMade),
        nodesRetrieved: 0, // Tool-based doesn't use RAG directly
        phaseTiming,
      };

      return {
        message: narrative,
        events,
        ...(stateChanges ? { stateChanges } : {}),
        metadata,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      events.push({
        type: 'error',
        timestamp: new Date(),
        payload: { message: errorMessage },
      });

      events.push({
        type: 'turn-completed',
        timestamp: new Date(),
        payload: {
          success: false,
          processingTimeMs: Date.now() - startTime,
        },
      });

      return {
        message: 'An error occurred while processing your action. Please try again.',
        events,
        success: false,
        error: {
          code: 'TOOL_TURN_ERROR',
          message: errorMessage,
          phase: 'tool-execution',
        },
      };
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Build initial messages including system prompt and context.
   */
  private buildInitialMessages(input: TurnInput): ChatMessageWithTools[] {
    const messages: ChatMessageWithTools[] = [];

    // System prompt that explains tool usage
    const systemPrompt = this.buildSystemPrompt();
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Add conversation history if available
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      for (const turn of input.conversationHistory.slice(-10)) {
        if (turn.speaker === 'player') {
          messages.push({ role: 'user', content: turn.content });
        } else {
          messages.push({ role: 'assistant', content: turn.content });
        }
      }
    }

    // Add current player input
    messages.push({
      role: 'user',
      content: input.playerInput,
    });

    return messages;
  }

  /**
   * Build system prompt that guides tool usage.
   */
  private buildSystemPrompt(): string {
    // Extract names from state slices safely
    const npcSlice = this.stateSlices.npc ?? this.stateSlices.character;
    const npcName = npcSlice?.name ?? 'the NPC';
    const settingSlice = this.stateSlices.setting;
    const settingName = settingSlice?.name ?? 'the current location';

    // Build active proximity context
    const proximityContext = this.buildProximityContext();

    return `You are a narrative game master. The player writes in third person, describing their character's actions.

## Current Scene
- NPC Present: ${npcName}
- Location: ${settingName}
${proximityContext}
## Your Role
Read the player's input and decide how to respond:

1. **If the player's action requires game data** (sensory details, NPC dialogue), call the appropriate tool first, then weave the result into your narrative.

2. **If the player's action is pure narrative** (describing thoughts, emotions, simple movements), write the response directly without calling tools.

## Tool Usage Guidelines

### get_sensory_detail
Call this when the player explicitly engages a sense with a target:
- "He inhales deeply near her hair" → get_sensory_detail(smell, ${npcName}, hair)
- "She runs her fingers along his arm" → get_sensory_detail(touch, ${npcName}, arm)
- "He studies her face intently" → get_sensory_detail(look, ${npcName}, face)

Do NOT call this for:
- "He looks up hopefully" (no target, emotional expression)
- "She glances around nervously" (not examining anything specific)
- "He turned his gaze away" (movement, not perception)

### npc_dialogue
Call this when the player speaks to or directly engages the NPC:
- "He says hello" → npc_dialogue
- "She asks about the weather" → npc_dialogue
- Any quoted speech directed at an NPC

Do NOT call this for:
- Internal thoughts
- Narration about the player character only
- Actions that don't involve NPC interaction

### update_proximity
Call this to track sensory engagements:
- When starting a new sensory engagement → update_proximity(engage)
- When increasing intimacy → update_proximity(intensify)
- When decreasing intimacy → update_proximity(reduce)
- When ending an engagement → update_proximity(end)

## Response Format
Write in third person past tense, matching the player's style. Be vivid but concise.
If you called tools, incorporate their data naturally into the narrative.
If the NPC responds, include their dialogue in quotes.
${proximityContext ? 'Continue to weave in active sensory engagements naturally.' : ''}`;
  }

  /**
   * Build proximity context section for system prompt.
   */
  private buildProximityContext(): string {
    const engagements = Object.values(this.proximityState.engagements);

    if (engagements.length === 0) {
      return '';
    }

    // Filter to recent engagements (within last 3 turns)
    const recentEngagements = engagements.filter(
      (e: SensoryEngagement) => this.currentTurn - e.lastActiveAt <= 3
    );

    if (recentEngagements.length === 0) {
      return '';
    }

    const engagementLines = recentEngagements
      .map(
        (e: SensoryEngagement) =>
          `- ${e.senseType} engaged with ${e.npcId}'s ${e.bodyPart} (${e.intensity})`
      )
      .join('\n');

    return `
## Active Sensory Context
The following sensory engagements are currently active:
${engagementLines}

Continue to acknowledge these in your narrative. If the player moves away or the NPC withdraws, call update_proximity(end) to end the engagement.
`;
  }

  /**
   * Call OpenRouter with tools.
   */
  private async callLLMWithTools(
    messages: ChatMessageWithTools[],
    tools: ToolDefinition[]
  ): Promise<OpenRouterToolResponse> {
    return this.chatWithTools({
      apiKey: this.apiKey,
      model: this.model,
      messages,
      tools,
      tool_choice: 'auto',
      timeoutMs: this.timeoutMs,
      options: {
        temperature: 0.7,
        max_tokens: 1024,
      },
    });
  }

  /**
   * Extract agent types from tool calls for metadata.
   */
  private extractAgentTypes(toolCalls: ToolCall[]): string[] {
    const agentTypes = new Set<string>();

    for (const call of toolCalls) {
      const toolName = call.function.name;

      if (toolName === 'get_sensory_detail') {
        agentTypes.add('sensory');
      } else if (toolName === 'npc_dialogue') {
        agentTypes.add('npc');
      } else if (toolName === 'navigate_player') {
        agentTypes.add('map');
      } else if (toolName === 'examine_object') {
        agentTypes.add('examine');
      } else if (toolName === 'use_item') {
        agentTypes.add('inventory');
      } else if (toolName === 'update_proximity') {
        agentTypes.add('proximity');
      }
    }

    return Array.from(agentTypes);
  }

  /**
   * Merge new state patches into accumulated patches.
   * Patches for the same slice are appended (applied sequentially).
   */
  private mergeStatePatches(target: StatePatches, source: StatePatches): void {
    for (const [sliceKey, patches] of Object.entries(source)) {
      if (!target[sliceKey]) {
        target[sliceKey] = [];
      }
      target[sliceKey].push(...patches);
    }
  }

  /**
   * Flatten multi-slice patches into a single array of operations.
   * Prefixes paths with slice key for disambiguation.
   */
  private flattenStatePatches(patches: StatePatches): Operation[] {
    const result: Operation[] = [];

    for (const [sliceKey, slicePatches] of Object.entries(patches)) {
      for (const patch of slicePatches) {
        // Prefix the path with slice key for tracking
        const prefixedPatch: Operation = {
          ...patch,
          path: `/${sliceKey}${patch.path}`,
        };
        result.push(prefixedPatch);
      }
    }

    return result;
  }

  /**
   * Extract modified paths from a list of patches.
   */
  private extractModifiedPaths(patches: Operation[]): string[] {
    const paths = new Set<string>();
    for (const patch of patches) {
      // Extract the top-level path segment
      const pathParts = patch.path.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        paths.add(pathParts[0] as string);
      }
    }
    return Array.from(paths);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a ToolBasedTurnHandler with the given configuration.
 */
export function createToolBasedTurnHandler(config: ToolTurnHandlerConfig): ToolBasedTurnHandler {
  return new ToolBasedTurnHandler(config);
}
