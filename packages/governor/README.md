# @minimal-rpg/governor

The Governor is the orchestration layer for the Minimal RPG. It implements a 7-step turn processing flow to handle player input, execute agents, and manage state changes.

## Overview

The Governor coordinates:

1. **Intent Detection**: Analyzing player input to determine intent (move, look, talk, etc.)
2. **State Recall**: Loading effective state via StateManager
3. **Context Retrieval**: Getting relevant knowledge nodes from the retrieval service
4. **Agent Routing**: Dispatching to appropriate agents based on intent
5. **Agent Execution**: Running agents and collecting outputs
6. **State Update**: Applying patches via StateManager
7. **Response Aggregation**: Combining agent outputs into TurnResult

## Installation

```bash
pnpm add @minimal-rpg/governor
```

## Usage

### Basic Usage

```typescript
import { createGovernor, createRuleBasedIntentDetector } from '@minimal-rpg/governor';
import { StateManager } from '@minimal-rpg/state-manager';
import { DefaultAgentRegistry, MapAgent, NpcAgent } from '@minimal-rpg/agents';

// Create dependencies
const stateManager = new StateManager();
const agentRegistry = new DefaultAgentRegistry();
agentRegistry.register(new MapAgent());
agentRegistry.register(new NpcAgent());

// Create governor
const governor = createGovernor({
  stateManager,
  agentRegistry,
  intentDetector: createRuleBasedIntentDetector(),
  logging: {
    logTurns: true,
    logAgents: true,
  },
});

// Handle a turn
const result = await governor.handleTurn({
  sessionId: 'session-123',
  playerInput: 'go north',
  baseline: { location: { name: 'Town Square' } },
  overrides: {},
});

console.log(result.message);
// "You head north into the forest..."
```

### With TurnInput Object

```typescript
const result = await governor.handleTurn({
  sessionId: 'session-123',
  playerInput: 'talk to the merchant',
  baseline: gameState,
  overrides: sessionOverrides,
  conversationHistory: [
    { speaker: 'player', content: 'hello', timestamp: new Date() },
    { speaker: 'character', content: 'Welcome!', timestamp: new Date() },
  ],
  turnNumber: 5,
});
```

### Simple Overload

```typescript
const result = await governor.handleTurn('session-123', 'look around');
```

## Intent Detection

The governor includes a rule-based intent detector for offline use:

```typescript
import { createRuleBasedIntentDetector } from '@minimal-rpg/governor';

const detector = createRuleBasedIntentDetector({
  minConfidence: 0.3,
  useContext: true,
});

const intent = await detector.detect('go to the castle', {
  currentLocation: 'Town Square',
  availableActions: ['move', 'look', 'talk'],
});
// { type: 'move', confidence: 0.8, params: { target: 'castle' } }
```

### Supported Intent Types

- `move` - Navigation commands (go, walk, enter, leave)
- `look` - Observation commands (look, observe, see)
- `examine` - Detailed inspection (examine, inspect, check)
- `talk` - Conversation (talk, speak, say, ask)
- `use` - Item usage (use, activate)
- `take` - Item pickup (take, get, grab)
- `give` - Item transfer (give, hand)
- `wait` - Pause (wait, rest)
- `system` - Meta commands (help, save, quit)
- `unknown` - Unrecognized input

## TurnResult Structure

```typescript
interface TurnResult {
  message: string; // Player-facing narrative
  success: boolean; // Whether turn completed successfully
  events?: TurnEvent[]; // Events emitted during turn
  stateChanges?: TurnStateChanges; // Summary of state changes
  metadata?: TurnMetadata; // Processing metadata
  error?: TurnError; // Error details if failed
}
```

## Configuration Options

```typescript
interface GovernorConfig {
  stateManager: StateManager; // Required
  agentRegistry?: AgentRegistry; // Optional - agents to route to
  retrievalService?: RetrievalService; // Optional - knowledge retrieval
  intentDetector?: IntentDetector; // Optional - uses fallback if not set
  logging?: {
    logTurns?: boolean;
    logAgents?: boolean;
    logStateChanges?: boolean;
    logIntentDetection?: boolean;
    logRetrieval?: boolean;
  };
  options?: {
    maxAgentsPerTurn?: number; // Default: 5
    continueOnAgentError?: boolean; // Default: true
    applyPatchesOnPartialFailure?: boolean; // Default: false
    intentConfidenceThreshold?: number; // Default: 0.3
  };
}
```

## Error Handling

The governor handles errors gracefully and returns them in the TurnResult:

```typescript
const result = await governor.handleTurn(input);

if (!result.success) {
  console.error(`Error in ${result.error?.phase}: ${result.error?.message}`);
  // Error codes: INTENT_DETECTION_FAILED, STATE_LOAD_FAILED,
  // RETRIEVAL_FAILED, NO_AGENT_FOUND, AGENT_EXECUTION_FAILED,
  // STATE_UPDATE_FAILED, VALIDATION_FAILED, UNKNOWN_ERROR
}
```

## Dependencies

- `@minimal-rpg/state-manager` - State computation and patch application
- `@minimal-rpg/agents` - Agent interfaces and implementations
- `@minimal-rpg/retrieval` - Knowledge node retrieval (optional)
- `fast-json-patch` - JSON Patch operations
