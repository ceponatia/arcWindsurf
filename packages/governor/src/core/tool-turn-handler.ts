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
import type { AgentOutput } from '@minimal-rpg/agents';
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

      // Build agentOutputs if npc_dialogue was called
      // This allows npc_messages to be populated with the NPC's portion of the response
      const agentTypes = this.extractAgentTypes(toolCallsMade);
      const agentOutputs: { agentType: string; output: AgentOutput }[] | undefined =
        agentTypes.includes('npc') ? [{ agentType: 'npc', output: { narrative } }] : undefined;

      const metadata: TurnMetadata = {
        processingTimeMs: Date.now() - startTime,
        agentsInvoked: agentTypes,
        nodesRetrieved: 0, // Tool-based doesn't use RAG directly
        phaseTiming,
        ...(agentOutputs ? { agentOutputs } : {}),
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
   * Uses 15-20 most recent messages for context window as per summarization docs.
   */
  private buildInitialMessages(input: TurnInput): ChatMessageWithTools[] {
    const messages: ChatMessageWithTools[] = [];

    // System prompt that explains tool usage and includes full scene context
    const systemPrompt = this.buildSystemPrompt(input);
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Add conversation history if available (15-20 turns per docs)
    // Keep last 18 messages to leave room for current input and responses
    const historyWindow = 18;
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      for (const turn of input.conversationHistory.slice(-historyWindow)) {
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
   * Build system prompt that guides tool usage with full scene context.
   * Includes character profile, setting, location, and NPC personality.
   */
  private buildSystemPrompt(input?: TurnInput): string {
    // Extract detailed context from state slices
    // Use type assertions for extended properties that may exist at runtime
    const npcSlice = this.stateSlices.npc ?? this.stateSlices.character;
    const settingSlice = this.stateSlices.setting as
      | (typeof this.stateSlices.setting & {
          description?: string;
          ambiance?: string;
          atmosphere?: string;
        })
      | undefined;
    const locationSlice = this.stateSlices.location;

    // Build NPC character context
    const npcName = npcSlice?.name ?? 'the NPC';
    const npcBackstory = npcSlice?.backstory;
    const npcPersonality = this.extractPersonalityString(npcSlice);
    const npcSpeechStyle = this.extractSpeechStyle(npcSlice);
    const npcGoals = npcSlice?.goals?.join('; ');

    // Build setting context - access extended properties safely
    const settingName = settingSlice?.name ?? 'the current location';
    const settingDescription = settingSlice?.description ?? settingSlice?.summary;
    const settingAmbiance = settingSlice?.ambiance ?? settingSlice?.atmosphere;

    // Build location context
    const locationName = locationSlice?.name;
    const locationDescription = locationSlice?.description;
    const locationExits = locationSlice?.exits;

    // Build active proximity context
    const proximityContext = this.buildProximityContext();

    // Build player persona context if available
    const personaContext = input?.persona ? this.buildPersonaContext(input.persona) : '';

    // Build sensory data context from NPC body map (if available)
    const sensoryDataContext = this.buildSensoryDataSummary(npcSlice);

    // Build conversation summary context if available (for long conversations)
    const summaryContext = input?.conversationSummary
      ? `
## Story So Far (Summary of Earlier Events)
${input.conversationSummary}
`
      : '';

    return `You are a narrative game master for a roleplay scenario. The player writes in third person, describing their character's actions.

## Current Scene
**NPC Present:** ${npcName}
**Location:** ${locationName ?? settingName}
${settingDescription ? `**Setting:** ${settingDescription}` : ''}
${locationDescription ? `**Environment:** ${locationDescription}` : ''}
${settingAmbiance ? `**Atmosphere:** ${settingAmbiance}` : ''}
${locationExits ? `**Exits:** ${JSON.stringify(locationExits)}` : ''}
${summaryContext}
## ${npcName} - Character Profile
${npcBackstory ? `**Background:** ${npcBackstory}` : ''}
${npcPersonality ? `**Personality:** ${npcPersonality}` : ''}
${npcSpeechStyle ? `**Speech Style:** ${npcSpeechStyle}` : ''}
${npcGoals ? `**Current Goals:** ${npcGoals}` : ''}
${personaContext}
${sensoryDataContext}
${proximityContext}

## Your Role - IMPORTANT
You are the game engine. You MUST call tools to drive the game forward. **Do NOT respond with plain text alone.**

Every player turn REQUIRES at least one tool call:
- **Player speaks/interacts with ${npcName}** → MUST call \`npc_dialogue\` first
- **Player engages senses** (look at, smell, touch, etc.) → MUST call \`get_sensory_detail\` first
- **Significant interaction** (compliment, insult, help, etc.) → MUST call \`update_relationship\`
- **Time passes** → MUST call \`advance_time\`

After tool(s) return data, weave the results into your narrative response.

## Tool Requirements (MANDATORY)

### npc_dialogue - REQUIRED for NPC interactions
**ALWAYS call this tool when:**
- The player says ANYTHING to ${npcName}
- The player does something that ${npcName} would notice or react to
- The player performs an action directed at ${npcName}
- You need to write ${npcName}'s dialogue or reaction

**Examples that REQUIRE npc_dialogue:**
- "He says hello" → npc_dialogue(${npcName}, "hello", speech)
- "She waves at her" → npc_dialogue(${npcName}, "waving", action)
- "He sits down next to her" → npc_dialogue(${npcName}, "sits down next to her", action)
- "She asks about her day" → npc_dialogue(${npcName}, "asks about her day", speech)

### get_sensory_detail - REQUIRED for sensory engagement
**ALWAYS call this tool when:**
- Player explicitly looks at, smells, touches, tastes, or listens to ${npcName}
- Player examines any body part or feature
- Player gets physically close for sensory purposes

**Examples that REQUIRE get_sensory_detail:**
- "He inhales near her hair" → get_sensory_detail(smell, ${npcName}, hair)
- "She touches his arm" → get_sensory_detail(touch, ${npcName}, arm)
- "He looks at her face" → get_sensory_detail(look, ${npcName}, face)
- "She examines her outfit" → get_sensory_detail(look, ${npcName}, outfit)

### update_proximity - Track sensory engagements
Call to track ongoing sensory contact:
- Starting engagement → update_proximity(engage)
- Increasing intimacy → update_proximity(intensify)
- Decreasing → update_proximity(reduce)
- Ending → update_proximity(end)

### update_relationship - Track relationship changes
**ALWAYS call after significant interactions:**
- Compliments, insults, gifts, help, lies, betrayals, flirting
- Use action_type OR dimension + delta

### advance_time - When time passes
Call when narrative indicates time passage: waiting, sleeping, activities.

## What NOT to do
- Do NOT write ${npcName}'s dialogue without calling npc_dialogue first
- Do NOT describe sensory details without calling get_sensory_detail first
- Do NOT skip tools and respond with just narrative
- The tools provide the data you need to write an authentic response

## Response Format Guidelines
1. **Call tools FIRST** - get data before writing your response
2. Write in third person past tense, matching the player's style
3. Be vivid but concise (2-4 sentences typically)
4. Incorporate tool data naturally into the narrative - this is your source material
5. Write ${npcName}'s dialogue in quotes, in first person from their perspective
6. Write ${npcName}'s actions in third person ("she smiled", "he nodded")
7. NEVER prefix responses with "${npcName}:" - just write the narrative directly
8. Include sensory details when the player is engaging senses${proximityContext ? '\n9. Continue to weave in active sensory engagements naturally' : ''}`;
  }

  /**
   * Extract personality traits as a readable string.
   */
  private extractPersonalityString(npc: typeof this.stateSlices.npc): string {
    if (!npc) return '';

    const parts: string[] = [];

    // Handle personality as string or array
    if (npc.personality) {
      if (Array.isArray(npc.personality)) {
        parts.push(npc.personality.join(', '));
      } else if (typeof npc.personality === 'string') {
        parts.push(npc.personality);
      }
    }

    // Handle personalityMap values and dimension sliders
    if (npc.personalityMap) {
      const pm = npc.personalityMap;
      if (pm.values?.length) {
        parts.push(`Values: ${pm.values.map((v) => v.value).join(', ')}`);
      }
      if (pm.emotionalBaseline) {
        parts.push(`Emotional baseline: ${pm.emotionalBaseline}`);
      }
    }

    return parts.join('. ');
  }

  /**
   * Extract speech style information.
   */
  private extractSpeechStyle(npc: typeof this.stateSlices.npc): string {
    if (!npc?.personalityMap?.speech) return '';

    const speech = npc.personalityMap.speech as typeof npc.personalityMap.speech & {
      quirks?: string[];
    };
    const parts: string[] = [];

    if (speech.vocabulary) parts.push(`vocabulary: ${speech.vocabulary}`);
    if (speech.formality) parts.push(`formality: ${speech.formality}`);
    if (speech.directness) parts.push(`directness: ${speech.directness}`);
    if (speech.quirks?.length) parts.push(`quirks: ${speech.quirks.join(', ')}`);

    return parts.join(', ');
  }

  /**
   * Build player persona context section.
   */
  private buildPersonaContext(persona: NonNullable<TurnInput['persona']>): string {
    const parts: string[] = ['', '## Player Character'];

    if (persona.name) parts.push(`**Name:** ${persona.name}`);
    if (persona.age !== undefined) parts.push(`**Age:** ${persona.age}`);
    if (persona.gender) parts.push(`**Gender:** ${persona.gender}`);
    if (persona.summary) parts.push(`**Description:** ${persona.summary}`);

    return parts.join('\n');
  }

  /**
   * Build a summary of available sensory data for the NPC.
   * This helps the LLM know what sensory details are available without calling tools.
   */
  private buildSensoryDataSummary(npc: typeof this.stateSlices.npc): string {
    if (!npc?.body) return '';

    const bodyParts: string[] = [];
    const body = npc.body;

    for (const [region, data] of Object.entries(body)) {
      if (!data) continue;
      const senses: string[] = [];
      if (data.scent?.primary) senses.push('smell');
      if (data.texture?.primary) senses.push('touch');
      if (data.flavor?.primary) senses.push('taste');
      if (data.visual?.description) senses.push('sight');
      if (senses.length > 0) {
        bodyParts.push(`${region}: ${senses.join(', ')}`);
      }
    }

    if (bodyParts.length === 0) return '';

    return `
## Available Sensory Data for ${npc.name}
The following body regions have sensory data defined (call get_sensory_detail to retrieve):
${bodyParts.map((p) => `- ${p}`).join('\n')}`;
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
