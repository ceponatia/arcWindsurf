# @minimal-rpg/governor

The Governor orchestrates player turns. The default path now routes directly through `NpcTurnHandler`, which executes `NpcAgent` without the legacy `npc_dialogue` tool-calling flow.

## Overview

- Turn handling with `NpcTurnHandler` (direct NpcAgent execution, deterministic ordering)
- State management via injected `toolTurnHandler` patches

## Installation

```bash
pnpm add @minimal-rpg/governor
```

## Usage (default NPC path)

```typescript
import { createGovernor, NpcTurnHandler } from '@minimal-rpg/governor';
import { NpcAgent } from '@minimal-rpg/agents';

const npcAgent = new NpcAgent({ /* inject llmProvider + services as needed */ });

const npcTurnHandler = new NpcTurnHandler({
  npcAgent,
  ownerEmail: 'player@example.com',
  stateSlices: gameStateSlices, // snapshot for this turn
});

const governor = createGovernor({
  toolTurnHandler: npcTurnHandler,
});

const result = await governor.handleTurn({
  sessionId: 'session-123',
  playerInput: 'talk to Taylor about the festival',
});

console.log(result.message);
```

### Legacy tool-calling

The legacy `ToolBasedTurnHandler` path has been removed from the public exports. Use `NpcTurnHandler` for NPC dialogue or behavior; non-NPC tool flows should migrate to explicit handlers in their owning packages.

## TurnResult structure

```typescript
interface TurnResult {
  message: string;
  success: boolean;
  events?: TurnEvent[];
  stateChanges?: TurnStateChanges;
  metadata?: TurnMetadata;
  error?: TurnError;
}
```

## Dependencies

- `@minimal-rpg/agents` for agent implementations (NpcAgent, SensoryAgent, etc.)
- `fast-json-patch` for JSON Patch operations
