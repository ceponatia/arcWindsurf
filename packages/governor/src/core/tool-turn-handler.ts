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

/**
 * Record of a tool call for persistence.
 */
export interface ToolCallHistoryRecord {
  sessionId: string;
  turnIdx: number;
  toolName: string;
  toolArgs: Record<string, unknown>;
  toolResult: Record<string, unknown> | undefined;
  success: boolean;
}

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

  /**
   * Callback to persist tool calls to history.
   * Called after each turn with all tool calls made during that turn.
   */
  onToolCallsComplete?: (calls: ToolCallHistoryRecord[]) => Promise<void>;
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
  private readonly onToolCallsComplete:
    | ((calls: ToolCallHistoryRecord[]) => Promise<void>)
    | undefined;
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
    this.onToolCallsComplete = config.onToolCallsComplete;
  }

  /**
   * Handle a player turn with tool calling.
   */
  async handleTurn(input: TurnInput): Promise<TurnResult> {
    const startTime = Date.now();
    const phaseTiming: PhaseTiming = {};
    const events: TurnEvent[] = [];
    const toolCallsMade: ToolCall[] = [];
    const toolCallResults = new Map<string, ToolResult>();
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

      if (this.debug) {
        console.log(`[ToolTurnHandler] Built ${messages.length} messages`);
        console.log(
          `[ToolTurnHandler] Available tools: ${tools.map((t) => t.function.name).join(', ')}`
        );
        // Show system prompt summary
        const systemMsg = messages.find((m) => m.role === 'system');
        if (systemMsg?.content) {
          console.log(`[ToolTurnHandler] System prompt length: ${systemMsg.content.length} chars`);
          // Show if tool examples are included
          if (systemMsg.content.includes('npc_dialogue')) {
            console.log(`[ToolTurnHandler] System prompt includes tool references ✓`);
          }
        }
      }

      // 2. Call LLM with tools
      // First try with 'required' to force tool usage, fall back to 'auto' if needed
      const executionStart = Date.now();
      let response: OpenRouterToolResponse = await this.callLLMWithTools(
        messages,
        tools,
        'required'
      );

      if (response.error) {
        // Some models don't support 'required' - fall back to 'auto'
        if (this.debug) {
          console.log(
            `[ToolTurnHandler] 'required' tool_choice failed, falling back to 'auto': ${response.error}`
          );
        }
        response = await this.callLLMWithTools(messages, tools, 'auto');
        if (response.error) {
          throw new Error(`LLM error: ${response.error}`);
        }
      }

      // If no tools were called, try once more with an explicit reminder
      if (!response.tool_calls || response.tool_calls.length === 0) {
        if (this.debug) {
          const content = response.message?.content ?? '';
          console.log(`[ToolTurnHandler] No tool calls on first attempt.`);
          console.log(`[ToolTurnHandler] Finish reason: ${response.finish_reason ?? 'unknown'}`);
          console.log(
            `[ToolTurnHandler] Response content (first 300 chars): "${content.substring(0, 300)}"`
          );

          // Check if the response contains tool-like JSON
          if (content.includes('npc_dialogue') || content.includes('get_sensory_detail')) {
            console.log(
              `[ToolTurnHandler] WARNING: Response contains tool names in TEXT instead of proper tool_calls!`
            );
            console.log(
              `[ToolTurnHandler] This suggests the LLM is outputting tool syntax as text instead of using the tool calling mechanism.`
            );
          }

          console.log(
            `[ToolTurnHandler] Retrying with tool reminder and 'required' tool_choice...`
          );
        }

        // Add the assistant's text response to context, then add a strong reminder
        if (response.message?.content) {
          messages.push({
            role: 'assistant',
            content: response.message.content,
          });
        }

        // Add a system reminder that forces tool usage - be very explicit about format
        messages.push({
          role: 'user',
          content:
            `[SYSTEM OVERRIDE: You MUST use the tool calling mechanism, not write about tools in text. ` +
            `Do NOT write "Here are the tool calls" - instead, actually invoke the tools using the function calling API. ` +
            `Call npc_dialogue with the NPC's response. This is mandatory.]`,
        });

        // Retry with 'required' to force tool usage
        response = await this.callLLMWithTools(messages, tools, 'required');

        // If 'required' fails, try 'auto' as fallback
        if (response.error) {
          if (this.debug) {
            console.log(`[ToolTurnHandler] Retry with 'required' failed: ${response.error}`);
          }
          response = await this.callLLMWithTools(messages, tools, 'auto');
        }

        if (response.error) {
          throw new Error(`LLM error on retry: ${response.error}`);
        }

        if (this.debug) {
          if (response.tool_calls && response.tool_calls.length > 0) {
            console.log(
              `[ToolTurnHandler] Retry successful - ${response.tool_calls.length} tool(s) called: ${response.tool_calls.map((tc) => tc.function.name).join(', ')}`
            );
          } else {
            console.log(`[ToolTurnHandler] Retry failed - still no tool calls`);
            console.log(
              `[ToolTurnHandler] Retry finish reason: ${response.finish_reason ?? 'unknown'}`
            );
            console.log(
              `[ToolTurnHandler] Retry content (first 300 chars): "${(response.message?.content ?? '').substring(0, 300)}"`
            );

            // Try to extract tool calls from text as last resort
            const textContent = response.message?.content ?? '';
            const syntheticToolCalls = this.tryParseToolCallsFromText(textContent);
            if (syntheticToolCalls && syntheticToolCalls.length > 0) {
              console.log(
                `[ToolTurnHandler] FALLBACK: Extracted ${syntheticToolCalls.length} tool call(s) from text: ${syntheticToolCalls.map((tc) => tc.function.name).join(', ')}`
              );
              response.tool_calls = syntheticToolCalls;
            }
          }
        } else {
          // Even without debug, try the fallback parser
          if (!response.tool_calls || response.tool_calls.length === 0) {
            const textContent = response.message?.content ?? '';
            const syntheticToolCalls = this.tryParseToolCallsFromText(textContent);
            if (syntheticToolCalls && syntheticToolCalls.length > 0) {
              response.tool_calls = syntheticToolCalls;
            }
          }
        }
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

          // Track result for persistence
          toolCallResults.set(toolCall.id, result);

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
          delete resultForLLM.statePatches;
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(resultForLLM),
          });
        }

        // Get next response (may have more tool calls or final answer)
        // Use 'auto' for continuation so LLM can generate final narrative
        response = await this.callLLMWithTools(messages, tools, 'auto');

        if (response.error) {
          throw new Error(`LLM error during tool loop: ${response.error}`);
        }

        iterations++;
      }

      phaseTiming.agentExecutionMs = Date.now() - executionStart;

      // 4. Persist tool call history (async, non-blocking)
      if (this.onToolCallsComplete && toolCallsMade.length > 0) {
        const toolHistoryRecords: ToolCallHistoryRecord[] = toolCallsMade.map((tc) => {
          const result = toolCallResults.get(tc.id);
          let args: Record<string, unknown> = {};
          try {
            const parsedUnknown: unknown = JSON.parse(tc.function.arguments);
            if (typeof parsedUnknown === 'object' && parsedUnknown !== null) {
              args = parsedUnknown as Record<string, unknown>;
            } else {
              args = { value: parsedUnknown };
            }
          } catch {
            args = { raw: tc.function.arguments };
          }
          // Build clean result for storage (exclude statePatches to save space)
          let cleanResult: Record<string, unknown> | undefined;
          if (result) {
            cleanResult = {
              success: result.success,
              ...(result.error && { error: result.error }),
              ...(result.hint && { hint: result.hint }),
            };
          }
          return {
            sessionId: this.sessionId,
            turnIdx: this.currentTurn,
            toolName: tc.function.name,
            toolArgs: args,
            toolResult: cleanResult,
            success: result?.success ?? false,
          };
        });

        // Fire and forget - don't block turn completion
        this.onToolCallsComplete(toolHistoryRecords).catch((err) => {
          console.warn('[ToolTurnHandler] Failed to persist tool call history:', err);
        });
      }

      // 5. Flatten accumulated patches for state changes
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

      // 5. Extract final narrative and clean it
      let narrative = response.message?.content ?? 'Nothing happens.';
      narrative = this.cleanNarrative(narrative);

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
   * Reduces history window to 10 messages to maintain tool calling patterns.
   * Injects tool usage reminder for conversations with established tool history.
   */
  private buildInitialMessages(input: TurnInput): ChatMessageWithTools[] {
    const messages: ChatMessageWithTools[] = [];

    // System prompt that explains tool usage and includes full scene context
    const systemPrompt = this.buildSystemPrompt(input);
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Add conversation summary if available (for older context)
    if (input.conversationSummary) {
      messages.push({
        role: 'system',
        content: `[Context from earlier in conversation]\n${input.conversationSummary}`,
      });
    }

    // Add conversation history if available
    // Reduced from 18 to 10 messages to prevent tool calling pattern degradation
    const historyWindow = 10;
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      const history = input.conversationHistory.slice(-historyWindow);

      // If this is a long conversation with tool history, add a synthetic tool usage reminder
      // This helps maintain the pattern of tool calling that the LLM doesn't see in raw history
      if (
        input.toolHistory?.stats?.totalCalls &&
        input.toolHistory.stats.totalCalls > 5 &&
        input.conversationHistory.length > historyWindow
      ) {
        const recentTools = input.toolHistory.stats.recentTools ?? [];
        const toolHints = input.toolHistory.usageHints ?? [];
        const toolsUsed =
          recentTools.length > 0 ? recentTools.join(', ') : 'npc_dialogue, get_sensory_detail';

        messages.push({
          role: 'system',
          content:
            `[Tool Usage Pattern - IMPORTANT]\n` +
            `This conversation has ${input.toolHistory.stats.totalCalls} tool calls across ${input.conversationHistory.length} turns.\n` +
            `Most recent tools used: ${toolsUsed}\n` +
            `${toolHints.length > 0 ? `Guidance: ${toolHints.join('; ')}\n` : ''}` +
            `Continue using tools as established. Every player interaction requires at least one tool call.`,
        });
      }

      for (const turn of history) {
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

    // Build session tags context (rules/behavior modifiers)
    const tagsContext = this.buildSessionTagsContext(input?.sessionTags);

    return `You are a narrative game master and game engine for a third-person roleplay scenario.

Stay in-world, decisive, and consistent. Use the context below as constraints (do not restate it).

HARD RULE: Every player turn requires at least one tool call. Never respond with narrative alone.

${tagsContext}
## Current Scene
**NPC Present:** ${npcName}
**Location:** ${locationName ?? settingName}
${settingDescription ? `**Setting:** ${settingDescription}` : ''}
${locationDescription ? `**Environment:** ${locationDescription}` : ''}
${settingAmbiance ? `**Atmosphere:** ${settingAmbiance}` : ''}
${locationExits ? `**Exits:** ${JSON.stringify(locationExits)}` : ''}

## ${npcName} - Character Profile
${npcBackstory ? `**Background:** ${npcBackstory}` : ''}
${npcPersonality ? `**Personality:** ${npcPersonality}` : ''}
${npcSpeechStyle ? `**Speech Style:** ${npcSpeechStyle}` : ''}
${npcGoals ? `**Current Goals:** ${npcGoals}` : ''}
${personaContext}
${sensoryDataContext}
${proximityContext}

## Tool Use (MANDATORY)
Call tools BEFORE writing any narrative. After tools return, write concise third-person past-tense narrative that incorporates the tool results.

- If the player speaks to or interacts with ${npcName}, call \`npc_dialogue\` first.
- If the player explicitly senses (look/smell/touch/taste/listen) a target or inspects a body part, call \`get_sensory_detail\` first.
- If sensory contact is ongoing or changes (start/intensify/reduce/end), call \`update_proximity\` to keep continuity.
- If an interaction meaningfully shifts rapport (compliment/insult/help/flirt/betray/etc.), call \`update_relationship\`.
- If time passes, call \`advance_time\`.

## Constraints
- Do not mention tool names, JSON, or system/meta text in the narrative.
- Do not invent sensory specifics: use tool results, active sensory context, or provided descriptions.
- If there are active sensory engagements listed, maintain them until ended with \`update_proximity\`.
- Write dialogue inline in quotes; do not prefix with "${npcName}:".`;
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
        parts.push(`Emotional baseline: ${JSON.stringify(pm.emotionalBaseline)}`);
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
      if (data.visual?.description) senses.push('look');
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
      .map((e: SensoryEngagement) => {
        const label = e.senseType === 'hear' ? 'listen' : e.senseType;
        return `- ${label} engaged with ${e.npcId}'s ${e.bodyPart} (${e.intensity})`;
      })
      .join('\n');

    return `
## Active Sensory Context
The following sensory engagements are currently active:
${engagementLines}

Continue to acknowledge these in your narrative. If the player moves away or the NPC withdraws, call update_proximity(end) to end the engagement.
`;
  }

  /**
   * Build session tags context section for system prompt.
   * Session tags provide rules/behavior modifiers that affect how the scene plays out.
   */
  private buildSessionTagsContext(sessionTags?: NonNullable<TurnInput['sessionTags']>): string {
    if (!sessionTags || sessionTags.length === 0) {
      return '';
    }

    const tagLines = sessionTags.map((tag) => {
      const description = tag.shortDescription ? ` - ${tag.shortDescription}` : '';
      return `### ${tag.name}${description}
${tag.promptText}`;
    });

    return `
## Active Session Rules & Modifiers
The following rules and modifiers are active for this session. Incorporate them into your narrative:

${tagLines.join('\n\n')}
`;
  }

  /**
   * Call OpenRouter with tools.
   * @param toolChoice - How the model should choose tools: 'auto' | 'none' | 'required'
   */
  private async callLLMWithTools(
    messages: ChatMessageWithTools[],
    tools: ToolDefinition[],
    toolChoice: 'auto' | 'none' | 'required' = 'auto'
  ): Promise<OpenRouterToolResponse> {
    return this.chatWithTools({
      apiKey: this.apiKey,
      model: this.model,
      messages,
      tools,
      tool_choice: toolChoice,
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
      target[sliceKey] ??= [];
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
        paths.add(pathParts[0]!);
      }
    }
    return Array.from(paths);
  }

  /**
   * Clean narrative output by removing tool annotations and meta-commentary.
   * The LLM sometimes includes notes about tools in its response.
   */
  private cleanNarrative(narrative: string): string {
    // Remove lines that are pure tool/system annotations
    const patterns = [
      // (Note: Tools like `update_proximity`... would be triggered...)
      /\(Note:.*?tools?.*?\)/gi,
      // [SYSTEM: ...]
      /\[SYSTEM:.*?\]/gi,
      // (Tools: ...)
      /\(Tools?:.*?\)/gi,
      // Standalone tool references like "update_proximity(...)" or "`npc_dialogue`"
      /`[a-z_]+(?:\([^)]*\))?`/gi,
      // Lines starting with "Reminder:" or "Note:"
      /^(Reminder|Note):\s*.*$/gim,
    ];

    let cleaned = narrative;
    for (const pattern of patterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Clean up multiple newlines and trim
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    return cleaned;
  }

  /**
   * Attempt to extract tool call syntax from text content.
   * This is a fallback for when the LLM outputs tool calls as text instead of using
   * the proper function calling mechanism.
   *
   * DeepSeek often outputs JSON arguments directly without wrapping in a tool call structure,
   * so we need to infer the tool name from context and argument patterns.
   *
   * @param content - The text content that might contain tool call syntax
   * @returns Array of synthetic tool calls, or undefined if none found
   */
  private tryParseToolCallsFromText(content: string): ToolCall[] | undefined {
    const toolCalls: ToolCall[] = [];

    // Try to find JSON blocks (with or without ```json``` wrapper)
    const jsonBlockPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;

    for (const match of content.matchAll(jsonBlockPattern)) {
      try {
        const jsonStr = match[1];
        if (!jsonStr) continue;
        const parsedUnknown: unknown = JSON.parse(jsonStr);
        if (!this.isPlainRecord(parsedUnknown)) continue;
        const parsed = parsedUnknown;

        // First check if it has explicit tool name
        const explicitToolName =
          (typeof parsed['name'] === 'string' ? parsed['name'] : undefined) ??
          (typeof parsed['tool'] === 'string' ? parsed['tool'] : undefined) ??
          (typeof parsed['function'] === 'string' ? parsed['function'] : undefined);

        if (explicitToolName) {
          const args = parsed['arguments'] ?? parsed['args'] ?? parsed['parameters'] ?? parsed;

          toolCalls.push({
            id: `synthetic-${Date.now()}-${toolCalls.length}`,
            type: 'function',
            function: {
              name: explicitToolName,
              arguments: typeof args === 'string' ? args : JSON.stringify(args),
            },
          });
          continue;
        }

        // Infer tool from argument patterns
        const inferredTool = this.inferToolFromArguments(parsed);
        if (inferredTool) {
          toolCalls.push({
            id: `synthetic-${Date.now()}-${toolCalls.length}`,
            type: 'function',
            function: {
              name: inferredTool,
              arguments: JSON.stringify(parsed),
            },
          });
        }
      } catch {
        // Not valid JSON, skip
      }
    }

    // If no code blocks found, look for inline JSON that looks like npc_dialogue args
    if (toolCalls.length === 0) {
      // Look for JSON with npc_id and player_utterance (npc_dialogue signature)
      const inlineNpcDialogue = /\{\s*"npc_id"\s*:\s*"[^"]+"\s*,\s*"player_utterance"\s*:/;
      if (inlineNpcDialogue.test(content)) {
        // Try to extract the full JSON object
        const startIdx = content.search(/\{\s*"npc_id"/);
        if (startIdx !== -1) {
          // Find matching closing brace
          let braceCount = 0;
          let endIdx = startIdx;
          for (let i = startIdx; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIdx = i + 1;
              break;
            }
          }

          try {
            const jsonStr = content.slice(startIdx, endIdx);
            const parsedUnknown: unknown = JSON.parse(jsonStr);
            if (
              this.isPlainRecord(parsedUnknown) &&
              typeof parsedUnknown['npc_id'] === 'string' &&
              typeof parsedUnknown['player_utterance'] === 'string'
            ) {
              toolCalls.push({
                id: `synthetic-dialogue-${Date.now()}`,
                type: 'function',
                function: {
                  name: 'npc_dialogue',
                  arguments: JSON.stringify(parsedUnknown),
                },
              });
            }
          } catch {
            // Invalid JSON
          }
        }
      }
    }

    // Check for context clues near "npc_dialogue" mention
    if (toolCalls.length === 0 && content.toLowerCase().includes('npc_dialogue')) {
      // Look for any JSON object after npc_dialogue mention
      const afterDialogue = content.slice(content.toLowerCase().indexOf('npc_dialogue'));
      const jsonMatch = /\{[\s\S]*?\}/.exec(afterDialogue);
      if (jsonMatch?.[0]) {
        try {
          const parsedUnknown: unknown = JSON.parse(jsonMatch[0]);
          if (this.isPlainRecord(parsedUnknown)) {
            // If it has npc_id or player_utterance, treat as npc_dialogue args
            if (
              parsedUnknown['npc_id'] !== undefined ||
              parsedUnknown['player_utterance'] !== undefined
            ) {
              toolCalls.push({
                id: `synthetic-dialogue-context-${Date.now()}`,
                type: 'function',
                function: {
                  name: 'npc_dialogue',
                  arguments: JSON.stringify(parsedUnknown),
                },
              });
            }
          }
        } catch {
          // Invalid JSON
        }
      }
    }

    if (this.debug && toolCalls.length > 0) {
      console.log(
        `[ToolTurnHandler] Fallback parser extracted ${toolCalls.length} tool(s): ${toolCalls.map((tc) => tc.function.name).join(', ')}`
      );
    }

    return toolCalls.length > 0 ? toolCalls : undefined;
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Infer tool name from argument structure.
   */
  private inferToolFromArguments(args: Record<string, unknown>): string | undefined {
    const keys = Object.keys(args);

    // npc_dialogue: has npc_id and player_utterance
    if (keys.includes('npc_id') && keys.includes('player_utterance')) {
      return 'npc_dialogue';
    }

    // get_sensory_detail: has npc_id and body_region
    if (keys.includes('npc_id') && keys.includes('body_region')) {
      return 'get_sensory_detail';
    }

    // update_proximity: has npc_id, body_region, and engagement_level
    if (
      keys.includes('npc_id') &&
      keys.includes('body_region') &&
      keys.includes('engagement_level')
    ) {
      return 'update_proximity';
    }

    // navigate_player: has destination or direction
    if (keys.includes('destination') || keys.includes('direction')) {
      return 'navigate_player';
    }

    // update_relationship: has npc_id and dimension or delta
    if (keys.includes('npc_id') && (keys.includes('dimension') || keys.includes('delta'))) {
      return 'update_relationship';
    }

    // examine_object: has object_name or target
    if (keys.includes('object_name') || (keys.includes('target') && !keys.includes('npc_id'))) {
      return 'examine_object';
    }

    return undefined;
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
