# @minimal-rpg/governor

The Governor is the orchestration layer for the Minimal RPG. It delegates turn processing to a tool-based turn handler where the LLM decides which tools to call based on player input.

## Overview

The Governor coordinates:

1. **Turn Handling**: Delegating to ToolBasedTurnHandler for LLM tool calling
2. **State Management**: Applying state patches returned from tool execution
3. **Response Assembly**: Building TurnResult from tool outputs

## Installation

```bash
pnpm add @minimal-rpg/governor
```

## Usage

### Basic Usage

```typescript
import { createGovernor, createToolBasedTurnHandler } from '@minimal-rpg/governor';
import { StateManager } from '@minimal-rpg/state-manager';

// Create dependencies
const stateManager = new StateManager();

// Create tool turn handler (requires LLM integration setup)
const toolTurnHandler = createToolBasedTurnHandler({
  stateSlices: gameStateSlices,
  conversationHistory: history,
  chatWithTools: openRouterChatWithTools,
});

// Create governor
const governor = createGovernor({
  stateManager,
  toolTurnHandler, // Required
  logging: {
    logTurns: true,
    logStateChanges: true,
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

## Tool-Based Architecture

The Governor uses LLM tool calling instead of rule-based intent detection:

- **Tools define available actions** (`get_sensory_detail`, `npc_dialogue`, `navigate_player`, etc.)
- **LLM decides which tools to call** based on player input and context
- **Tools return state patches** that the Governor applies to game state

This eliminates the need for separate intent detection, reducing latency and improving accuracy.

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
  toolTurnHandler: ToolTurnHandler; // Required - LLM tool calling handler
  npcTranscriptLoader?: NpcTranscriptLoader; // Optional - NPC history loading
  actionSequencer?: ActionSequencer; // Optional - multi-action handling
  logging?: {
    logTurns?: boolean;
    logStateChanges?: boolean;
    logActionSequence?: boolean;
  };
  options?: {
    devMode?: boolean; // Default: false
    npcInterjectionThreshold?: number; // Default: 3
    useActionSequencer?: boolean; // Default: false
  };
}
```

## Error Handling

The governor handles errors gracefully and returns them in the TurnResult:

```typescript
const result = await governor.handleTurn(input);

if (!result.success) {
  console.error(`Error in ${result.error?.phase}: ${result.error?.message}`);
  // Error codes: TOOL_EXECUTION_FAILED, STATE_UPDATE_FAILED, UNKNOWN_ERROR
}
```

## Dependencies

- `@minimal-rpg/state-manager` - State computation and patch application
- `@minimal-rpg/agents` - Agent interfaces (for tool execution)
- `fast-json-patch` - JSON Patch operations
