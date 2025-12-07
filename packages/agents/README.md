# @minimal-rpg/agents

This package contains specialized agent implementations for Minimal RPG. Agents are domain-specific workers that the Governor routes requests to based on detected intent.

## Agent Types

### MapAgent (Navigation)

Handles movement and exploration:

- **Intents**: `move`, `look`
- **Capabilities**:
  - Interprets movement directions and validates exits
  - Describes locations and available exits
  - Uses knowledge context for target inspection

```typescript
import { MapAgent } from '@minimal-rpg/agents';

const agent = new MapAgent();

const result = await agent.execute({
  sessionId: 'session-1',
  playerInput: 'go north',
  intent: { type: 'move', params: { direction: 'north' }, confidence: 1 },
  stateSlices: {
    location: {
      id: 'town-square',
      name: 'Town Square',
      description: 'A bustling marketplace.',
      exits: [{ direction: 'north', targetId: 'castle-gate' }],
    },
  },
});
```

### NpcAgent (Dialogue)

Handles conversations with characters:

- **Intents**: `talk`
- **Capabilities**:
  - Generates in-character dialogue
  - Uses character profile and personality traits
  - Supports LLM-powered or template-based responses

```typescript
import { NpcAgent } from '@minimal-rpg/agents';

const agent = new NpcAgent({ llmProvider: myLlmProvider });

const result = await agent.execute({
  sessionId: 'session-1',
  playerInput: 'Hello, how are you?',
  intent: { type: 'talk', params: {}, confidence: 1 },
  stateSlices: {
    character: {
      instanceId: 'char-1',
      name: 'Aria',
      summary: 'A brave adventurer',
      personalityTraits: ['brave', 'curious'],
    },
  },
});
```

### RulesAgent (System)

Handles game rules and item interactions:

- **Intents**: `use`, `take`, `give`, `attack`
- **Capabilities**:
  - Manages inventory operations
  - Validates item usage
  - Emits events for combat and state changes

```typescript
import { RulesAgent } from '@minimal-rpg/agents';

const agent = new RulesAgent();

const result = await agent.execute({
  sessionId: 'session-1',
  playerInput: 'use healing potion',
  intent: { type: 'use', params: { item: 'healing potion' }, confidence: 1 },
  stateSlices: {
    inventory: {
      items: [{ id: 'potion-1', name: 'Healing Potion', usable: true }],
    },
  },
});
```

### ParserAgent (Normalization)

Handles profile parsing and attribute extraction:

- **Intents**: `custom` with `action: 'parse'`
- **Capabilities**:
  - Extracts structured attributes from free-text
  - Uses regex patterns and LLM-based extraction
  - Generates JSON Patch operations for profile updates

```typescript
import { ParserAgent, DEFAULT_PARSER_PATTERNS } from '@minimal-rpg/agents';

const agent = new ParserAgent({
  llmProvider: myLlmProvider,
  patterns: DEFAULT_PARSER_PATTERNS,
});

const result = await agent.execute({
  sessionId: 'session-1',
  playerInput: 'She has bright green eyes and long brown hair',
  intent: { type: 'custom', params: { action: 'parse' }, confidence: 1 },
  stateSlices: {},
});

// result.statePatches contains:
// [
//   { op: 'add', path: '/appearance/eyes/color', value: 'green' },
//   { op: 'add', path: '/appearance/hair/color', value: 'brown' },
// ]
```

## Agent Contract

All agents implement the `Agent` interface:

```typescript
interface Agent {
  readonly agentType: AgentType;
  readonly name: string;
  execute(input: AgentInput): Promise<AgentOutput>;
  canHandle(intent: AgentIntent): boolean;
}
```

### Input

- `sessionId`: Session identifier
- `playerInput`: Raw player text
- `intent`: Detected intent with type, params, and confidence
- `stateSlices`: Relevant effective state for the agent's domain
- `knowledgeContext`: Retrieved knowledge nodes (from retrieval layer)
- `conversationHistory`: Recent conversation turns

### Output

- `narrative`: Player-facing text
- `statePatches`: JSON Patch operations for state changes
- `events`: Events for cross-agent communication
- `diagnostics`: Execution metrics (time, token usage, warnings)

## Agent Registry

Use the `DefaultAgentRegistry` to manage agent instances:

```typescript
import { DefaultAgentRegistry, MapAgent, NpcAgent, RulesAgent } from '@minimal-rpg/agents';

const registry = new DefaultAgentRegistry();

registry.register(new MapAgent());
registry.register(new NpcAgent({ llmProvider }));
registry.register(new RulesAgent());

// Find agents for an intent
const handlers = registry.findForIntent({
  type: 'move',
  params: { direction: 'north' },
  confidence: 1,
});
```

## BaseAgent

Extend `BaseAgent` to create custom agents with built-in timing, diagnostics, and error handling:

```typescript
import { BaseAgent, AgentInput, AgentOutput, AgentIntent } from '@minimal-rpg/agents';

class CustomAgent extends BaseAgent {
  readonly agentType = 'custom' as const;
  readonly name = 'My Custom Agent';

  canHandle(intent: AgentIntent): boolean {
    return intent.type === 'custom';
  }

  protected async process(input: AgentInput): Promise<AgentOutput> {
    // Your agent logic here
    return {
      narrative: 'Custom response',
    };
  }
}
```

## Relationship to Other Packages

- **Governor**: Routes requests to agents and aggregates their outputs
- **State Manager**: Agents produce patches; Governor uses StateManager to apply them
- **Retrieval**: Provides knowledge context to agents
- **Schemas**: Agents work with strongly-typed state slices

## Status

This package provides the core agent implementations:

- ✅ **BaseAgent**: Common functionality for all agents
- ✅ **MapAgent**: Navigation and exploration
- ✅ **NpcAgent**: Character dialogue (template + LLM)
- ✅ **RulesAgent**: Game rules and items
- ✅ **ParserAgent**: Profile normalization
- ✅ **DefaultAgentRegistry**: Agent management
