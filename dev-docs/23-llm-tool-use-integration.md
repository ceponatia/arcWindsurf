# LLM Tool Use / Function Calling Integration

This document explores how LLM function calling (tool use) could enhance the minimal-rpg architecture, replacing rigid code paths with intelligent, model-driven decisions.

## What is Tool Use / Function Calling?

Tool use allows an LLM to call backend functions dynamically instead of just generating text. The flow works in three phases:

### 1. Tool Definition (What the LLM sees)

You provide the model with a `tools` array describing available functions:

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_player_status',
      description: 'Get current player stats including HP, location, and inventory',
      parameters: {
        type: 'object',
        properties: {
          playerId: { type: 'string', description: 'The player session ID' },
        },
        required: ['playerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_to_location',
      description: 'Move the player to a new location',
      parameters: {
        type: 'object',
        properties: {
          locationId: { type: 'string' },
          direction: { type: 'string', enum: ['north', 'south', 'east', 'west', 'up', 'down'] },
        },
        required: ['locationId'],
      },
    },
  },
];
```

### 2. Model Response (Tool call instead of text)

Instead of replying with prose, the model returns:

```json
{
  "role": "assistant",
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "get_player_status",
        "arguments": "{\"playerId\":\"session_xyz\"}"
      }
    }
  ]
}
```

### 3. Tool Execution + Follow-up

Your app:

1. Parses `tool_calls`
2. Executes the real function (DB query, state update, etc.)
3. Sends the result back as a `tool` message:

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "name": "get_player_status",
  "content": "{\"hp\":10,\"location\":\"The Old Mill\",\"inventory\":[\"rusty sword\",\"torch\"]}"
}
```

The model then calls the LLM again with the full context. The model produces a natural language response or requests more tool calls.

## DeepSeek via OpenRouter Compatibility

OpenRouter presents an OpenAI-compatible Chat Completions API. Tool calling works when:

- The API accepts a `tools` array (or legacy `functions`)
- The model returns `tool_calls` in the assistant message

DeepSeek-V3 and similar instruction-tuned models generally handle function calling well through OpenAI-compatible interfaces.

**Caveat**: Different models vary in JSON schema adherence and argument quality. Testing is required.

## Current Architecture: Where We Use Rigid Code

Our codebase has several areas where deterministic code makes routing/dispatch decisions that could benefit from LLM intelligence:

### 1. Intent Detection → Agent Routing (High Value)

**Current approach** ([governor.ts](../packages/governor/src/core/governor.ts)):

```typescript
// Phase 4: Agent Routing - deterministic mapping
private routeToAgents(intent: DetectedIntent): Agent[] {
  const agentIntent = buildAgentIntent(intent, (t) => this.mapIntentType(t));
  return this.agentRegistry.findForIntent(agentIntent);
}
```

The `LlmIntentDetector` classifies intent, then rigid code maps intent types to agents via `canHandle()` checks.

**Problem**: The LLM understands nuance but we throw it away, using simple pattern matching to route:

- `move` → MapAgent
- `talk` → NpcAgent
- `use/take/give` → RulesAgent
- `smell/touch` → SensoryAgent

**Tool-based alternative**: Let the LLM directly call the tools it needs:

```typescript
const agentTools = [
  {
    name: 'navigate_player',
    description: 'Move player to a new location or describe available exits',
    parameters: { direction: 'string', describe_only: 'boolean' },
  },
  {
    name: 'npc_dialogue',
    description: 'Generate NPC dialogue response to player speech or action',
    parameters: { npc_id: 'string', player_utterance: 'string', action_context: 'string' },
  },
  {
    name: 'use_item',
    description: 'Player uses an inventory item, optionally on a target',
    parameters: { item_name: 'string', target: 'string?' },
  },
  {
    name: 'get_sensory_detail',
    description: 'Retrieve sensory information about a target (smell, touch, taste, etc.)',
    parameters: { sense_type: 'string', target: 'string', body_part: 'string?' },
  },
];
```

The model could call multiple tools in sequence for compound inputs like:

> "Sure _he takes her hand and notices her perfume_"

Instead of our current multi-phase segmentation → parallel agent execution, the LLM would:

1. Call `npc_dialogue` for the "Sure" speech
2. Call `use_item` or a physical action tool for "takes her hand"
3. Call `get_sensory_detail` for "notices her perfume"

### 2. Sensory Target Resolution (Medium Value)

**Current approach** ([sensory-agent.ts](../packages/agents/src/sensory/sensory-agent.ts#L648)):

```typescript
private resolveTarget(input: AgentInput): { ... } | null {
  const targetName = input.intent?.params?.target?.toLowerCase();
  // Rigid matching: if target contains NPC name, target = NPC
  // Otherwise check location objects, default to NPC
}
```

**Problem**: Target resolution uses substring matching:

```typescript
if (target.includes(npcName) || npcName.includes(target)) {
  return { type: 'npc', entity: npc, ... };
}
```

This fails on:

- Pronouns: "smell her" (who is "her"?)
- Contextual references: "the merchant" vs character named "Greta the Merchant"
- Ambiguous targets: "the door" in a room with multiple doors

**Tool-based alternative**:

```typescript
{
  name: 'resolve_target',
  description: 'Identify what entity the player is referring to',
  parameters: {
    reference: 'string',      // "her", "the door", "that thing"
    context_type: 'string',   // "sensory", "action", "dialogue"
    available_entities: 'array'  // NPCs, objects in scene
  }
}
```

### 3. Item Interaction Logic (Medium Value)

**Current approach** ([rules-agent.ts](../packages/agents/src/rules/rules-agent.ts)):

```typescript
private handleUse(input: AgentInput): AgentOutput {
  const itemName = input.intent?.params.item;
  const item = this.findItem(inventory?.items ?? [], itemName);
  if (!item) return { narrative: `You don't have a ${itemName}.` };
  if (item.usable === false) return { narrative: `You cannot use...` };
  // Very basic - no creativity in how items can be combined or used
}
```

**Problem**: Item interactions are limited to pre-defined `usable` flags. No creative problem-solving:

- "Use rope on cliff" - requires explicit rope+cliff interaction definition
- "Combine herbs with mortar" - crafting requires hardcoded recipes

**Tool-based alternative**:

```typescript
{
  name: 'evaluate_item_use',
  description: 'Determine if and how an item can be used in the current situation',
  parameters: {
    item_id: 'string',
    target: 'string?',
    player_intent: 'string',
    current_location: 'object',
    available_mechanics: 'array'  // ['crafting', 'combat', 'puzzle', etc.]
  }
}
```

The LLM could reason about plausible item interactions within the game's mechanics.

### 4. Movement Validation (Lower Value)

**Current approach** ([map-agent.ts](../packages/agents/src/map/map-agent.ts)):

```typescript
private handleMove(input: AgentInput, location: LocationSlice): AgentOutput {
  const direction = input.intent?.params.direction;
  const exit = this.findExit(location, direction);
  if (!exit) return { narrative: `You cannot go ${direction} from here.` };
  if (exit.accessible === false) return { narrative: '...' };
}
```

**Problem**: Movement is strictly bound to defined exits. Players can't:

- Climb things not marked as climbable
- Squeeze through gaps not defined as exits
- Use creative approaches ("I jump across the broken bridge")

**Tool-based alternative**: Keep exit validation deterministic, but add:

```typescript
{
  name: 'attempt_creative_movement',
  description: 'Player attempts non-standard movement not matching defined exits',
  parameters: {
    action: 'string',
    current_location: 'object',
    player_stats: 'object',    // strength, agility, items carried
    difficulty_class: 'number' // for skill checks
  }
}
```

### 5. Knowledge Retrieval Query Building (Medium Value)

**Current approach** ([governor.ts](../packages/governor/src/core/governor.ts) Phase 3):

```typescript
// Context Retrieval - fixed query based on player input
const retrievalResult = await this.retrievalService.retrieve({
  queryText: playerInput, // Just the raw input
  sessionId,
  // ...
});
```

**Problem**: Query is just the player input. The retrieval doesn't know:

- What the player is likely to ask about next
- Which NPCs/locations are contextually relevant
- What background information would enrich the response

**Tool-based alternative**:

```typescript
{
  name: 'build_context_query',
  description: 'Generate optimal search queries for knowledge retrieval',
  parameters: {
    player_input: 'string',
    recent_topics: 'array',
    current_npcs: 'array',
    current_location: 'string'
  }
}
```

The LLM outputs focused queries like:

- "Elara's relationship with the player"
- "History of the Old Mill location"
- "Merchant guild politics"

## Implementation Strategy

### Phase 1: Tool-Augmented Intent Detection

Replace the separate intent detection + routing with a single tool-calling step:

```typescript
// Instead of:
// 1. LlmIntentDetector.detect() → DetectedIntent
// 2. routeToAgents(intent) → Agent[]
// 3. executeAgents(agents)

// Do:
// 1. LLM with tools → tool_calls[]
// 2. Execute each tool call directly
// 3. Send results back, get final narrative
```

### Phase 2: Hybrid Approach

Keep deterministic validation for game rules, use tools for intelligence:

```typescript
const tools = [
  // Intelligent tools (LLM decides when/how to call)
  { name: 'npc_dialogue', ... },
  { name: 'describe_scene', ... },
  { name: 'resolve_ambiguity', ... },

  // Validation tools (LLM must respect their constraints)
  { name: 'validate_movement', ... },  // Returns allowed/blocked
  { name: 'check_inventory', ... },    // Returns what player has
];
```

### Phase 3: Full Tool Orchestration

The LLM becomes the orchestrator, calling tools as needed:

```text
Player: "I ask Elara about the rumors while checking if my sword is sharp"

LLM thinks: This is compound. I need to:
1. Get Elara's current mood/relationship
2. Generate dialogue about rumors
3. Check player's sword condition

Tool calls:
1. get_npc_state(npc_id: "elara")
2. retrieve_knowledge(query: "current rumors in town")
3. check_item_condition(item: "sword")

Results returned, LLM generates:
"Elara leans in conspiratorially. 'The merchants have been whispering about
strange lights in the forest...' You run your thumb along your blade's edge -
still sharp enough, though it could use a whetstone soon."
```

## Skeleton Implementation

```typescript
// packages/api/src/llm/tool-runner.ts

import type { ChatRole } from '../types.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string; // JSON string result
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export class ToolRunner {
  private handlers = new Map<string, ToolHandler>();
  private definitions: ToolDefinition[] = [];

  register(def: ToolDefinition, handler: ToolHandler): void {
    this.definitions.push(def);
    this.handlers.set(def.name, handler);
  }

  getDefinitions(): ToolDefinition[] {
    return this.definitions;
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const handler = this.handlers.get(call.function.name);
    if (!handler) {
      return {
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify({ error: `Unknown tool: ${call.function.name}` }),
      };
    }

    try {
      const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
      const result = await handler(args);
      return {
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      };
    } catch (err) {
      return {
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify({ error: String(err) }),
      };
    }
  }
}

// Example usage with Governor integration
export function createGameToolRunner(deps: {
  getSession: (id: string) => Promise<Session>;
  getCharacter: (id: string) => Promise<CharacterProfile>;
  retrieveKnowledge: (query: string) => Promise<KnowledgeNode[]>;
}): ToolRunner {
  const runner = new ToolRunner();

  runner.register(
    {
      name: 'get_npc_state',
      description: 'Get current state of an NPC including mood, relationship, and location',
      parameters: {
        type: 'object',
        properties: {
          npc_id: { type: 'string', description: 'The NPC template or instance ID' },
        },
        required: ['npc_id'],
      },
    },
    async (args) => {
      const character = await deps.getCharacter(args.npc_id as string);
      return {
        name: character.name,
        mood: character.personality?.currentMood,
        traits: character.personality?.traits,
      };
    }
  );

  runner.register(
    {
      name: 'retrieve_knowledge',
      description: 'Search the knowledge base for relevant information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for' },
          limit: { type: 'number', description: 'Max results to return' },
        },
        required: ['query'],
      },
    },
    async (args) => {
      const nodes = await deps.retrieveKnowledge(args.query as string);
      return nodes.slice(0, (args.limit as number) ?? 5).map((n) => ({
        path: n.path,
        content: n.content,
      }));
    }
  );

  // Add more tools...

  return runner;
}
```

## Comparison: Current vs Tool-Based

| Aspect                    | Current Approach                  | Tool-Based Approach             |
| ------------------------- | --------------------------------- | ------------------------------- |
| **Intent Classification** | LLM → JSON → code routing         | LLM directly calls tools        |
| **Compound Inputs**       | Segment parsing → parallel agents | LLM calls tools in sequence     |
| **Target Resolution**     | Substring matching                | LLM reasons about context       |
| **Item Interactions**     | Pre-defined usable flags          | LLM evaluates plausibility      |
| **Latency**               | 1 LLM call + N agent calls        | 1-3 LLM calls with tool loops   |
| **Token Cost**            | Lower (simple prompts)            | Higher (tool schemas + results) |
| **Flexibility**           | Limited to coded intents          | Open-ended within tool space    |
| **Reliability**           | Predictable                       | Depends on model quality        |

## Recommendations

### Start With: Intent → Tool Unification

The highest-value change is replacing the intent detection + agent routing pipeline with direct tool calling. This:

1. Eliminates the lossy intent classification step
2. Allows the LLM to call multiple tools for compound inputs naturally
3. Reduces code complexity (no more segment parsing)

### Preserve: Deterministic Game Rules

Keep validation logic in code:

- Inventory capacity limits
- Movement exit validation
- Combat damage calculations

These should be tools the LLM calls, but the tools enforce the rules.

### Experiment With: Creative Interactions

Item combination, creative problem-solving, and ambiguous target resolution are good candidates for LLM reasoning via tools.

## Open Questions

1. **Latency**: Tool loops add round-trips. Can we batch tool calls?
2. **Reliability**: What happens when the LLM calls tools incorrectly?
3. **Cost**: Tool schemas add tokens. How do we minimize overhead?
4. **Testing**: How do we test non-deterministic tool sequences?
5. **Fallback**: What's the graceful degradation when the LLM fails?

## Related Documents

- [13-agent-io-contracts.md](./13-agent-io-contracts.md) - Current agent interface design
- [14-prompting-conventions.md](./14-prompting-conventions.md) - Prompt construction patterns
- [gov-plan.md](../gov-plan.md) - Original Governor + LLM integration plan
