# Tool Calling Integration Plan

This document outlines the plan for replacing portions of the current intent detection and agent routing system with LLM tool calling, creating a hybrid architecture that leverages both approaches.

## Implementation Status

- ✅ Phase 1: Tool-Calling OpenRouter Adapter (COMPLETE)
- ✅ Phase 2: Tool Definitions (COMPLETE)
- ✅ Phase 3: Tool Executor Service (COMPLETE)
- ✅ Phase 4: Tool-Based Turn Handler (COMPLETE)
- ✅ Phase 5: Governor Integration (COMPLETE)
- ✅ Phase 6: Full Rollout (COMPLETE - classic mode removed)

## Current Architecture Overview

### Tool-Based Flow (Current)

```text
Player Input
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  LLM with Tools                                         │
│                                                         │
│  System Prompt: You are an RPG game master...           │
│  Tools: [npc_dialogue, get_sensory_detail, ...]         │
│                                                         │
│  The LLM decides:                                       │
│  1. Which tools to call (replaces intent detection)     │
│  2. What arguments to pass (replaces param extraction)  │
│  3. How to synthesize results (replaces composer)       │
└─────────────────────────────────────────────────────────┘
    │
    ├── tool_call: get_sensory_detail({sense: "smell", target: "Elara"})
    │       │
    │       ▼
    │   Tool Result: {smell: [{source: "hair", description: "lavender"}]}
    │
    ├── tool_call: npc_dialogue({npc: "Elara", utterance: "hello"})
    │       │
    │       ▼
    │   Tool Result: {reaction: "curious", suggested_tone: "playful"}
    │
    └── Final LLM Response (with tool results)
            │
            ▼
        Unified narrative response
```

### Key Benefits (Realized)

1. **Single LLM call for most turns** - Intent detection + response in one round-trip
2. **LLM chooses tools naturally** - Better handling of ambiguous/compound inputs
3. **Parallel tool calls** - DeepSeek can request multiple tools at once
4. **Structured tool results** - Agents return data, LLM writes prose
5. **Graceful fallback** - If no tools needed, LLM responds directly

### Legacy System (Removed December 2025)

The following components were removed as part of Phase 6:

- `RuleBasedIntentDetector` - Replaced by LLM tool selection
- `LlmIntentDetector` - Replaced by LLM tool selection
- `handleTurnClassic()` - Replaced by `ToolBasedTurnHandler`
- `routeToAgents()` - Replaced by tool execution
- `ResponseComposer` - Replaced by LLM narrative synthesis
- `TURN_HANDLER` config - Tool calling is now required
- `INTENT_DEBUG` config - No longer applicable

## Implementation Phases

### Phase 1: Tool-Calling OpenRouter Adapter

**Goal**: Add tool calling support to the OpenRouter adapter without changing existing agents.

**Files to modify**:

- `packages/api/src/llm/openrouter.ts`
- `packages/api/src/types.ts`

**New types**:

```typescript
interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface ChatMessageWithTools {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}
```

**New function**:

```typescript
export async function chatWithOpenRouterTools(
  opts: ChatWithOpenRouterOptions & { tools?: ToolDefinition[] }
): Promise<OpenRouterChatResponse & { tool_calls?: ToolCall[] }>;
```

### Phase 2: Tool Definitions for Game Actions

**Goal**: Define tools that map to current agent capabilities.

**New file**: `packages/governor/src/tools/definitions.ts`

**Implementation Priority**:

1. ✅ `get_sensory_detail` - First priority (wraps existing SensoryAgent)
2. ✅ `npc_dialogue` - First priority (wraps existing NpcAgent)
3. ⏳ `navigate_player` - Future (wraps MapAgent)
4. ⏳ `use_item` - Future (inventory system)
5. ⏳ `examine_object` - Future (detailed inspection)

```typescript
import type { ToolDefinition } from './types.js';

// =============================================================================
// PRIORITY 1: Core Tools (Implement First)
// =============================================================================

/**
 * Sensory detail tool - retrieves character/object sensory data.
 * Wraps SensoryAgent to return structured data for LLM narrative synthesis.
 */
export const GET_SENSORY_DETAIL_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_sensory_detail',
    description:
      'Retrieve sensory information about a target. Use this when the player wants to smell, touch, taste, look at, or listen to something or someone.',
    parameters: {
      type: 'object',
      properties: {
        sense_type: {
          type: 'string',
          enum: ['smell', 'touch', 'taste', 'look', 'listen'],
          description: 'The type of sensory perception',
        },
        target: {
          type: 'string',
          description: 'What or who the player is sensing (character name or object)',
        },
        body_part: {
          type: 'string',
          description:
            'Specific body part if targeting a character (e.g., hair, feet, hands, face)',
        },
      },
      required: ['sense_type', 'target'],
    },
  },
};

/**
 * NPC dialogue tool - generates NPC response context.
 * Wraps NpcAgent to provide character state for LLM narrative synthesis.
 */
export const NPC_DIALOGUE_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'npc_dialogue',
    description:
      'Generate NPC dialogue in response to player speech or action. Use this when the player talks to, interacts with, or addresses an NPC.',
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The ID or name of the NPC to interact with',
        },
        player_utterance: {
          type: 'string',
          description: 'What the player said or did',
        },
        interaction_type: {
          type: 'string',
          enum: ['speech', 'action', 'emote', 'thought'],
          description: 'The type of player interaction',
        },
        tone: {
          type: 'string',
          enum: ['friendly', 'hostile', 'neutral', 'flirty', 'formal', 'playful'],
          description: 'The emotional tone of the interaction',
        },
      },
      required: ['npc_id', 'player_utterance'],
    },
  },
};

// =============================================================================
// PRIORITY 2: Navigation & Environment (Implement Later)
// =============================================================================

/**
 * Navigation tool - moves player or describes available exits.
 * Will wrap MapAgent for location state management.
 *
 * STATUS: PLACEHOLDER - Not yet implemented
 */
export const NAVIGATE_PLAYER_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'navigate_player',
    description:
      'Move the player to a new location or describe available exits. Use this when the player wants to move, go somewhere, or asks about exits/directions.',
    parameters: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['north', 'south', 'east', 'west', 'up', 'down'],
          description: 'The direction to move',
        },
        destination: {
          type: 'string',
          description: 'Named destination (e.g., "the kitchen", "outside")',
        },
        describe_only: {
          type: 'boolean',
          description: 'If true, just describe exits without moving',
        },
      },
      required: [],
    },
  },
};

/**
 * Examine object tool - provides detailed inspection of objects/areas.
 * Will provide rich descriptions from location/object data.
 *
 * STATUS: PLACEHOLDER - Not yet implemented
 */
export const EXAMINE_OBJECT_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'examine_object',
    description:
      'Closely examine an object, person, or area for details. Use this when the player wants to inspect, examine, or study something closely.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'What to examine (object, person, or area name)',
        },
        focus: {
          type: 'string',
          description: 'Specific aspect to focus on (e.g., "markings", "condition")',
        },
      },
      required: ['target'],
    },
  },
};

// =============================================================================
// PRIORITY 3: Inventory & Items (Implement Later)
// =============================================================================

/**
 * Use item tool - applies inventory items to targets.
 * Will integrate with inventory state management.
 *
 * STATUS: PLACEHOLDER - Not yet implemented
 */
export const USE_ITEM_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'use_item',
    description:
      'Use an item from inventory, optionally on a target. Use this when the player wants to use, apply, or activate an item.',
    parameters: {
      type: 'object',
      properties: {
        item_name: {
          type: 'string',
          description: 'The name of the item to use',
        },
        target: {
          type: 'string',
          description: 'Optional target for the item (person, object, or location)',
        },
        action: {
          type: 'string',
          description: 'Specific action to perform with the item (e.g., "drink", "throw", "read")',
        },
      },
      required: ['item_name'],
    },
  },
};

// =============================================================================
// PRIORITY 4: Future Tools (Design Only)
// =============================================================================

/**
 * Get NPC memory tool - retrieves NPC's memories of the player.
 * Will query relationship/memory storage.
 *
 * STATUS: DESIGN ONLY - Schema defined, not implemented
 */
export const GET_NPC_MEMORY_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_npc_memory',
    description:
      "Retrieve an NPC's memories and impressions of the player. Use when NPC behavior should reflect past interactions.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose memories to query',
        },
        memory_type: {
          type: 'string',
          enum: ['recent', 'significant', 'emotional', 'all'],
          description: 'Type of memories to retrieve',
        },
        topic: {
          type: 'string',
          description: 'Optional topic to filter memories',
        },
      },
      required: ['npc_id'],
    },
  },
};

/**
 * Update relationship tool - modifies NPC relationship state.
 * Will update relationship scores and flags.
 *
 * STATUS: DESIGN ONLY - Schema defined, not implemented
 */
export const UPDATE_RELATIONSHIP_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_relationship',
    description:
      "Update the relationship state between player and NPC. Use after significant interactions that would affect the NPC's opinion.",
    parameters: {
      type: 'object',
      properties: {
        npc_id: {
          type: 'string',
          description: 'The NPC whose relationship to update',
        },
        delta: {
          type: 'number',
          description: 'Change in relationship score (-1.0 to 1.0)',
        },
        reason: {
          type: 'string',
          description: 'Brief reason for the change',
        },
        flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Relationship flags to set (e.g., "first_kiss", "betrayed")',
        },
      },
      required: ['npc_id'],
    },
  },
};

// =============================================================================
// Tool Collections
// =============================================================================

/** Priority 1 tools - implement first */
export const CORE_TOOLS: ToolDefinition[] = [GET_SENSORY_DETAIL_TOOL, NPC_DIALOGUE_TOOL];

/** Priority 2 tools - implement after core */
export const ENVIRONMENT_TOOLS: ToolDefinition[] = [NAVIGATE_PLAYER_TOOL, EXAMINE_OBJECT_TOOL];

/** Priority 3 tools - implement after environment */
export const INVENTORY_TOOLS: ToolDefinition[] = [USE_ITEM_TOOL];

/** Priority 4 tools - future implementation */
export const RELATIONSHIP_TOOLS: ToolDefinition[] = [GET_NPC_MEMORY_TOOL, UPDATE_RELATIONSHIP_TOOL];

/** All game tools - use for full tool-calling mode */
export const ALL_GAME_TOOLS: ToolDefinition[] = [
  ...CORE_TOOLS,
  ...ENVIRONMENT_TOOLS,
  ...INVENTORY_TOOLS,
  ...RELATIONSHIP_TOOLS,
];

/**
 * Get tools appropriate for current implementation phase.
 * Start with CORE_TOOLS, expand as handlers are implemented.
 */
export function getActiveTools(): ToolDefinition[] {
  // Phase 2 implementation: only core tools are active
  return CORE_TOOLS;

  // Future: return ALL_GAME_TOOLS when all handlers ready
}
```

### Phase 3: Tool Executor Service

**Goal**: Create a service that executes tool calls using existing agents.

**New file**: `packages/governor/src/tools/executor.ts`

**Handler Implementation Status**:

| Tool                  | Handler Status | Wraps                 |
| --------------------- | -------------- | --------------------- |
| `get_sensory_detail`  | ✅ Implement   | SensoryAgent          |
| `npc_dialogue`        | ✅ Implement   | NpcAgent              |
| `navigate_player`     | ⏳ Placeholder | MapAgent (future)     |
| `examine_object`      | ⏳ Placeholder | (new logic)           |
| `use_item`            | ⏳ Placeholder | Inventory (future)    |
| `get_npc_memory`      | ⏳ Placeholder | Memory (future)       |
| `update_relationship` | ⏳ Placeholder | Relationship (future) |

```typescript
import type { ToolCall, ToolResult } from './types.js';
import type { SensoryAgent } from '@minimal-rpg/agents';
import type { NpcAgent } from '@minimal-rpg/agents';
import type { TurnStateContext } from '../core/types.js';

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

// =============================================================================
// Tool Executor
// =============================================================================

export class ToolExecutor {
  private readonly sessionId: string;

  constructor(
    private sensoryAgent: SensoryAgent,
    private npcAgent: NpcAgent,
    private stateSlices: TurnStateContext,
    sessionId: string
  ) {
    this.sessionId = sessionId;
  }

  /**
   * Execute a tool call and return structured result.
   * Unknown tools return an error result (not thrown).
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

    switch (toolCall.function.name) {
      // Priority 1: Core tools (fully implemented)
      case 'get_sensory_detail':
        return this.executeSensory(args as SensoryToolArgs);
      case 'npc_dialogue':
        return this.executeNpcDialogue(args as NpcDialogueToolArgs);

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

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolCall.function.name}`,
        };
    }
  }

  // ===========================================================================
  // Priority 1: Core Tool Handlers (IMPLEMENT FIRST)
  // ===========================================================================

  /**
   * Execute sensory detail lookup using SensoryAgent.
   * Returns structured sensory context for LLM to weave into narrative.
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

    const output = await this.sensoryAgent.execute(agentInput);

    if (!output.sensoryContext || Object.keys(output.sensoryContext.available).length === 0) {
      return {
        success: false,
        error: `No ${args.sense_type} data available for ${args.target}`,
        hint: 'The target may not have sensory data defined',
      };
    }

    return {
      success: true,
      sense_type: args.sense_type,
      target: args.target,
      body_part: args.body_part,
      sensory_data: output.sensoryContext.available,
      narrative_hints: output.sensoryContext.narrativeHints,
    };
  }

  /**
   * Execute NPC dialogue context retrieval.
   * Returns character state and context for LLM to generate dialogue.
   */
  private async executeNpcDialogue(args: NpcDialogueToolArgs): Promise<ToolResult> {
    const npc = this.stateSlices.npc ?? this.stateSlices.character;

    if (!npc) {
      return {
        success: false,
        error: `NPC "${args.npc_id}" not found`,
        available_npcs: [], // TODO: list available NPCs
      };
    }

    // Extract personality context for LLM
    const personalityContext: Record<string, unknown> = {};

    if (npc.personalityMap) {
      const pm = npc.personalityMap;
      if (pm.speech) {
        personalityContext.speech_style = pm.speech;
      }
      if (pm.emotional?.baseline) {
        personalityContext.emotional_baseline = pm.emotional.baseline;
      }
      if (pm.values?.length) {
        personalityContext.core_values = pm.values.slice(0, 3).map((v) => v.value);
      }
    }

    if (npc.personality) {
      personalityContext.traits = Array.isArray(npc.personality)
        ? npc.personality
        : [npc.personality];
    }

    return {
      success: true,
      npc_id: args.npc_id,
      npc_name: npc.name,
      npc_summary: npc.summary,
      npc_backstory: npc.backstory,
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
  private async executeNavigate(args: NavigateToolArgs): Promise<ToolResult> {
    // TODO: Integrate with MapAgent and location state

    const location = this.stateSlices.location;

    if (args.describe_only || (!args.direction && !args.destination)) {
      return {
        success: true,
        action: 'describe_exits',
        current_location: location?.name ?? 'Unknown',
        available_exits: location?.exits ?? {},
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
  private async executeExamine(args: ExamineToolArgs): Promise<ToolResult> {
    // TODO: Integrate with location objects and character inspection

    // Check if examining an NPC
    const npc = this.stateSlices.npc ?? this.stateSlices.character;
    if (npc && args.target.toLowerCase().includes(npc.name.toLowerCase())) {
      return {
        success: true,
        target: npc.name,
        target_type: 'character',
        description: npc.summary ?? `You see ${npc.name}.`,
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
  private async executeUseItem(args: UseItemToolArgs): Promise<ToolResult> {
    // TODO: Integrate with inventory state

    const inventory = this.stateSlices.inventory;
    const items = (inventory?.items as Array<{ name: string }>) ?? [];

    const hasItem = items.some((i) => i.name.toLowerCase().includes(args.item_name.toLowerCase()));

    if (!hasItem) {
      return {
        success: false,
        error: `You don't have "${args.item_name}"`,
        available_items: items.map((i) => i.name),
      };
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
  // Priority 4: Relationship Tool Handlers (PLACEHOLDER)
  // ===========================================================================

  /**
   * PLACEHOLDER: Retrieve NPC memories of player.
   * Will query relationship/memory storage.
   */
  private async executeGetNpcMemory(args: GetNpcMemoryToolArgs): Promise<ToolResult> {
    // TODO: Integrate with memory/relationship system

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
  private async executeUpdateRelationship(args: UpdateRelationshipToolArgs): Promise<ToolResult> {
    // TODO: Integrate with relationship state

    return {
      success: false,
      error: 'Relationship system not yet implemented',
      npc_id: args.npc_id,
      requested_delta: args.delta,
      hint: 'Relationship updates pending relationship system',
    };
  }
}
```

### Phase 4: Tool-Based Turn Handler

**Goal**: Create an alternative turn processing path that uses tool calling.

**New file**: `packages/governor/src/core/tool-turn-handler.ts`

```typescript
export class ToolBasedTurnHandler {
  constructor(
    private llmProvider: OpenRouterWithTools,
    private toolExecutor: ToolExecutor,
    private stateManager: StateManager
  ) {}

  async handleTurn(input: TurnInput): Promise<TurnResult> {
    // 1. Build initial messages with system prompt and tools
    const messages = this.buildInitialMessages(input);

    // 2. Call LLM with tools
    let response = await this.llmProvider.chat({
      messages,
      tools: GAME_TOOLS,
      tool_choice: 'auto',
    });

    // 3. Tool execution loop
    const toolResults: ToolResult[] = [];
    while (response.tool_calls?.length) {
      for (const toolCall of response.tool_calls) {
        const result = await this.toolExecutor.execute(toolCall);
        toolResults.push(result);

        messages.push({
          role: 'assistant',
          tool_calls: [toolCall],
        });
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // Get next response (may have more tool calls or final answer)
      response = await this.llmProvider.chat({
        messages,
        tools: GAME_TOOLS,
      });
    }

    // 4. Extract final narrative
    const narrative = response.content ?? 'Nothing happens.';

    return {
      message: narrative,
      success: true,
      metadata: {
        toolCalls: toolResults.length,
        // ...
      },
    };
  }
}
```

### Phase 5: Hybrid Governor Mode

**Goal**: Allow the governor to switch between rule-based and tool-based modes.

**Modify**: `packages/governor/src/core/governor.ts`

```typescript
interface GovernorConfig {
  // ... existing config
  turnHandler?: 'classic' | 'tool-calling' | 'hybrid';
}

class Governor {
  async handleTurn(input: TurnInput): Promise<TurnResult> {
    if (this.config.turnHandler === 'tool-calling') {
      return this.toolTurnHandler.handleTurn(input);
    }

    if (this.config.turnHandler === 'hybrid') {
      // Use tool-calling for complex inputs, classic for simple ones
      const complexity = this.assessInputComplexity(input.playerInput);
      if (complexity === 'high') {
        return this.toolTurnHandler.handleTurn(input);
      }
    }

    // Classic flow
    return this.classicHandleTurn(input);
  }

  private assessInputComplexity(input: string): 'low' | 'high' {
    // Heuristics:
    // - Multiple asterisk-wrapped actions → high
    // - Contains sensory + dialogue → high
    // - Simple commands like "go north" → low
    // - Quoted speech only → low
    const hasMultipleActions = (input.match(/\*/g) ?? []).length >= 4;
    const hasSensoryKeywords = /smell|touch|taste|feel|sniff/i.test(input);
    const hasDialogue = /["']/.test(input) || /\bsay\b/i.test(input);

    if (hasMultipleActions || (hasSensoryKeywords && hasDialogue)) {
      return 'high';
    }
    return 'low';
  }
}
```

### Phase 6: Migration and Optimization

**Goal**: Gradually migrate all turns to tool-calling while optimizing performance.

**Tasks**:

1. Add metrics to compare classic vs tool-calling response quality
2. Tune tool descriptions for better LLM routing
3. Consider caching tool results (e.g., sensory data doesn't change often)
4. Add streaming support for faster perceived response times

## Tool Design Principles

### What Makes a Good Tool

1. **Clear trigger conditions** - The LLM should know exactly when to use it
2. **Minimal required params** - Only ask for what's truly required
3. **Structured output** - Return data, let LLM write prose
4. **Idempotent** - Safe to call multiple times with same args
5. **Fast execution** - Tools should be quick (< 100ms ideally)

### Tools vs Direct LLM Response

| Use Tool When                | Let LLM Respond Directly    |
| ---------------------------- | --------------------------- |
| Need game state data         | Pure dialogue with no state |
| Modifying state              | Out-of-character questions  |
| Need character-specific info | Simple narration            |
| Complex multi-step actions   | Emotional reactions only    |

### Tool Naming Conventions

- Use `get_*` for read-only data retrieval
- Use `do_*` or verb prefix for state-changing actions
- Keep names under 30 chars for prompt efficiency
- Match names to user mental model (not internal architecture)

## Comparison: Before and After

### Example: "I smell Elara's hair and say hello"

**Before (Current Architecture)**:

```text
1. RuleBasedIntentDetector parses input
2. Segments: [sensory("smell hair"), talk("say hello")]
3. Governor routes to: SensoryAgent, NpcAgent
4. SensoryAgent builds sensoryContext (no prose)
5. NpcAgent receives sensoryContext, writes combined narrative
6. ResponseComposer concatenates outputs
7. Total: ~2 LLM calls (intent detection + NPC response)
```

**After (Tool-Calling)**:

```text
1. LLM receives input with tools
2. LLM decides: call get_sensory_detail() and npc_dialogue()
3. Tools execute, return structured data
4. LLM writes unified narrative using tool results
5. Total: 1 LLM call with 2 tool round-trips
```

**Latency Comparison**:

- Before: ~1.5s (500ms intent) + ~1s (NPC) = ~2.5s
- After: ~1.2s (LLM + tools) = ~1.2s (with parallel tool calls)

### Example: Simple "go north"

**Before**:

```text
1. RuleBasedIntentDetector: move, direction=north
2. Governor routes to: MapAgent
3. MapAgent updates location state
4. Total: 0 LLM calls (rule-based)
```

**After (Hybrid Mode)**:

```text
1. Complexity check: "low" (simple command)
2. Fall back to classic flow
3. Same as before
```

For simple commands, the hybrid approach avoids unnecessary LLM calls.

## Migration Checklist

### Phase 1: OpenRouter Adapter

- [x] Add `chatWithOpenRouterTools()` to `packages/api/src/llm/openrouter.ts`
- [x] Add tool-related types to `packages/api/src/types.ts`
- [x] Add `ToolDefinition`, `ToolCall`, `ChatMessageWithTools` interfaces
- [x] Handle `tool_calls` in response parsing
- [x] Add tool result message support

### Phase 2: Tool Definitions

- [x] Create `packages/governor/src/tools/` directory
- [x] Create `packages/governor/src/tools/types.ts` with shared types
- [x] Create `packages/governor/src/tools/definitions.ts`
- [x] Implement `GET_SENSORY_DETAIL_TOOL` definition
- [x] Implement `NPC_DIALOGUE_TOOL` definition
- [x] Implement `UPDATE_PROXIMITY_TOOL` definition
- [x] Add `NAVIGATE_PLAYER_TOOL` placeholder ⏳ Priority 2
- [x] Add `EXAMINE_OBJECT_TOOL` placeholder ⏳ Priority 2
- [x] Add `USE_ITEM_TOOL` placeholder ⏳ Priority 3
- [x] Add `GET_NPC_MEMORY_TOOL` placeholder ⏳ Priority 4
- [x] Add `UPDATE_RELATIONSHIP_TOOL` placeholder ⏳ Priority 4
- [x] Export `getActiveTools()` function

### Phase 3: Tool Executor

- [x] Create `packages/governor/src/tools/executor.ts`
- [x] Implement `ToolExecutor` class
- [x] Implement `executeSensory()` handler
- [x] Implement `executeNpcDialogue()` handler
- [x] Implement `executeProximity()` handler with StatePatches
- [x] Add `executeNavigate()` placeholder ⏳ Priority 2
- [x] Add `executeExamine()` placeholder ⏳ Priority 2
- [x] Add `executeUseItem()` placeholder ⏳ Priority 3
- [x] Add `executeGetNpcMemory()` placeholder ⏳ Priority 4
- [x] Add `executeUpdateRelationship()` placeholder ⏳ Priority 4
- [x] Add error handling and validation
- [x] Add fallback handler support for extensibility

### Phase 4: Tool-Based Turn Handler

- [x] Create `packages/governor/src/core/tool-turn-handler.ts`
- [x] Implement `ToolBasedTurnHandler` class
- [x] Build system prompt with game context
- [x] Implement tool execution loop with max iterations
- [x] Add tool message types to conversation history
- [x] Handle tool call failures gracefully
- [x] Integrate StatePatches for state changes from tools
- [x] Add proximity context to system prompt

### Phase 5: Hybrid Governor Mode

- [x] Add `turnHandler` config option to `GovernorConfig`
- [x] Implement `assessInputComplexity()` heuristic
- [x] Wire up `ToolBasedTurnHandler` in Governor
- [x] Add TURN_HANDLER env var for mode selection
- [x] Add logging for tool calling decisions

### Phase 6: Full Rollout (COMPLETE - December 2025)

- [x] Remove classic mode entirely - tool calling is now required
- [x] Remove TURN_HANDLER config (always tool-calling)
- [x] Remove INTENT_DEBUG config (no longer applicable)
- [x] Delete RuleBasedIntentDetector and LlmIntentDetector
- [x] Delete handleTurnClassic and routeToAgents from Governor
- [x] Update Governor README to reflect tool-calling only architecture
- [ ] Add metrics: tool call count, latency, token usage (future enhancement)
- [ ] Tune tool descriptions based on real usage patterns (ongoing)
- [ ] Consider tool result caching for immutable data (future enhancement)
- [x] Document tool extension patterns in dev-docs

### Future: Complete Tool Implementations

- [ ] `navigate_player`: Integrate with MapAgent
- [ ] `examine_object`: Add object/location inspection logic
- [ ] `use_item`: Integrate with inventory state
- [ ] `get_npc_memory`: Build memory retrieval system
- [ ] `update_relationship`: Build relationship state system

## Risk Mitigation

### Potential Issues

1. **Tool call loops** - LLM keeps calling tools indefinitely
   - Mitigation: Max iteration limit (5), timeout per turn

2. **Malformed tool args** - LLM sends invalid JSON
   - Mitigation: Try/catch with fallback to classic flow

3. **Higher token usage** - Tool definitions add to prompt
   - Mitigation: Lazy-load tools based on context

4. **Model compatibility** - Not all models support tools
   - Mitigation: Feature detection, fallback to classic

5. **Regression in response quality** - Tool-based responses differ
   - Mitigation: A/B testing, gradual rollout

## Future Considerations

### Tool Implementation Roadmap

The following tools have placeholder definitions and executor stubs ready for implementation:

| Tool                  | Priority | Blocks On              | Estimated Effort |
| --------------------- | -------- | ---------------------- | ---------------- |
| `navigate_player`     | P2       | MapAgent refactor      | Medium           |
| `examine_object`      | P2       | Location object schema | Low              |
| `use_item`            | P3       | Inventory state system | Medium           |
| `get_npc_memory`      | P4       | Memory/RAG system      | High             |
| `update_relationship` | P4       | Relationship schema    | Medium           |

### Additional Tools to Consider (No Placeholder Yet)

These tools may be valuable but haven't been designed yet:

- `check_rules` - Validate actions against game rules
- `get_time_of_day` - Query in-game time for contextual responses
- `trigger_event` - Fire scripted events or cutscenes
- `roll_dice` - Random outcomes for skill checks
- `query_knowledge` - RAG retrieval for lore/world info

### Advanced Patterns

- **Tool chaining** - Results from one tool feed into another
- **Speculative execution** - Pre-call likely tools while LLM generates
- **Tool caching** - Cache immutable tool results per turn
- **Streaming with tools** - Stream narrative while tools execute

## References

- [OpenRouter Tool Calling Docs](https://openrouter.ai/docs/features/tool-calls)
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [DeepSeek Tool Use Examples](https://api-docs.deepseek.com/guides/function_calling)
- [dev-docs/23-llm-tool-use-integration.md](23-llm-tool-use-integration.md) - Initial research
