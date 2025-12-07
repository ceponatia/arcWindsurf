# Sensory Agent

The Sensory Agent handles player intents related to physical senses: **smell**, **taste**, **touch**, and **listen**. It processes sensory requests against character and location data, generating immersive narrative responses.

## Overview

```text
Player Input: "I lean in and smell her hair"
     ↓
Intent Detection → { type: 'smell', target: 'her', bodyPart: 'hair' }
     ↓
SensoryAgent.handle()
     ↓
1. Resolve body region: 'hair' → canonical region 'hair'
2. Extract scent data from knowledge context for 'hair' region
3. Generate narrative using template or LLM
     ↓
Output: "Her hair carries the warm scent of vanilla and sunlight..."
```

## Supported Intent Types

| Intent   | Status         | Data Source                                         |
| -------- | -------------- | --------------------------------------------------- |
| `smell`  | ✅ Implemented | Character `body.{region}.scent` or legacy `scent.*` |
| `taste`  | ⏳ TBD         | Would require item/consumable taste data            |
| `touch`  | ⏳ TBD         | Would require `body.{region}.texture` data          |
| `listen` | ⏳ TBD         | Would require ambient sound data on locations       |

## Body Region System

The agent uses a canonical body region taxonomy with natural language aliases. This allows players to reference body parts naturally while the system maps them to consistent data keys.

### Canonical Regions

```text
head, face, hair, neck, shoulders, torso, chest, back, arms, hands, waist, hips, legs, feet
```

### Alias Resolution

Player input is resolved to canonical regions:

```typescript
resolveBodyRegion('tresses'); // → 'hair'
resolveBodyRegion('abdomen'); // → 'torso'
resolveBodyRegion('fingertips'); // → 'hands'
resolveBodyRegion('thighs'); // → 'legs'
resolveBodyRegion(undefined); // → 'torso' (default)
```

See `@minimal-rpg/schemas` for the full alias mapping (70+ aliases).

### Default Body Region

When no body part is specified ("I smell her"), the agent defaults to `torso` for a general body scent. This can be configured:

```typescript
const agent = new SensoryAgent({
  defaultBodyRegion: 'chest', // Use chest as default instead
});
```

## Usage

### Basic Usage

```typescript
import { SensoryAgent } from '@minimal-rpg/agents';

const agent = new SensoryAgent();

const result = await agent.handle({
  playerInput: 'I lean close and smell her hair',
  intent: {
    type: 'smell',
    params: {
      target: 'her',
      bodyPart: 'hair',
    },
  },
  stateSlices: {
    npc: { name: 'Lyra', summary: '...' },
  },
  knowledgeContext: [
    {
      id: 'lyra-hair-scent',
      path: 'body.hair.scent',
      content: 'a warm blend of vanilla and honey, with hints of summer flowers',
      score: 0.95,
    },
  ],
});

console.log(result.narrative);
// "Her hair carries a warm blend of vanilla and honey, with hints of summer flowers."
```

### With LLM Provider

```typescript
import { SensoryAgent } from '@minimal-rpg/agents';
import { OpenRouterProvider } from '@minimal-rpg/api/llm';

const agent = new SensoryAgent({
  llmProvider: new OpenRouterProvider({ model: 'deepseek/deepseek-chat' }),
  temperature: 0.7,
  maxTokens: 150,
});

// LLM will generate more creative narrative from the scent data
```

### With Inference

When explicit scent data isn't available, the agent can use LLM inference based on character context:

```typescript
const agent = new SensoryAgent({
  llmProvider: myLlmProvider,
  allowInference: true, // Enable inference (default: true)
  inferenceThreshold: 0.8, // Confidence threshold (default: 0.8)
});

// Even without scent data, if we have character description,
// the LLM may infer a plausible scent
```

## Configuration

```typescript
interface SensoryAgentConfig {
  // Base agent config
  llmProvider?: LlmProvider;
  temperature?: number;
  maxTokens?: number;

  // Sensory-specific
  inferenceThreshold?: number; // Default: 0.8
  allowInference?: boolean; // Default: true
  defaultBodyRegion?: BodyRegion; // Default: 'torso'
  includeBodyRegionInPrompts?: boolean; // Default: true
}
```

## Knowledge Context Format

The agent extracts sensory data from `KnowledgeContextItem[]` based on path patterns:

### New BodyMap Format (Preferred)

```json
{
  "path": "body.hair.scent",
  "content": "warm vanilla with hints of honey"
}
```

### Legacy Scent Format

```json
{
  "path": "scent.hairScent",
  "content": "warm vanilla with hints of honey"
}
```

### Region Matching

- `body.hair.scent` matches when `bodyRegion === 'hair'`
- `body.torso.scent` provides fallback for unmatched regions
- Legacy `scent.hairScent` maps to `hair` region

## Response Behavior

### Design Principle

**Never say "you don't notice anything."** The agent either provides immersive content or silently ignores the intent.

### Decision Flow

```text
Has explicit sensory data?
  YES → Generate narrative (template or LLM)
  NO  → Has LLM and inference allowed?
          YES → Attempt inference from character context
          NO  → Return empty response (intent ignored)
```

### Empty Responses

When the agent returns an empty narrative, the intent is effectively ignored. Diagnostics include the reason:

```typescript
{
  narrative: '',
  diagnostics: {
    warnings: ['SensoryAgent ignored intent: No scent data available'],
    debug: { ignored: true, reason: 'No scent data available' }
  }
}
```

## Static Properties

```typescript
SensoryAgent.HANDLED_INTENTS; // ['smell', 'taste', 'touch', 'listen']
SensoryAgent.SUPPORTED_BODY_REGIONS; // ['head', 'face', 'hair', ...]
```

## Instance Methods

| Method                        | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `canHandle(intent)`           | Check if this agent handles the intent type |
| `handle(input)`               | Process the sensory intent                  |
| `getDefaultBodyRegion()`      | Get the configured default body region      |
| `resolveBodyPart(rawPart)`    | Resolve alias to canonical region           |
| `isValidBodyReference(value)` | Check if string is a known body reference   |

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { SensoryAgent } from './sensory-agent.js';

describe('SensoryAgent', () => {
  it('resolves body part aliases', () => {
    const agent = new SensoryAgent();
    expect(agent.resolveBodyPart('tresses')).toBe('hair');
    expect(agent.resolveBodyPart('belly')).toBe('torso');
    expect(agent.resolveBodyPart(undefined)).toBe('torso');
  });

  it('handles smell intent with scent data', async () => {
    const agent = new SensoryAgent();
    const result = await agent.handle({
      playerInput: 'I smell her hair',
      intent: { type: 'smell', params: { bodyPart: 'hair' } },
      stateSlices: { npc: { name: 'Lyra' } },
      knowledgeContext: [
        {
          id: '1',
          path: 'body.hair.scent',
          content: 'vanilla and honey',
          score: 0.9,
        },
      ],
    });
    expect(result.narrative).toContain('vanilla');
  });

  it('ignores smell intent without data', async () => {
    const agent = new SensoryAgent({ allowInference: false });
    const result = await agent.handle({
      playerInput: 'I smell her',
      intent: { type: 'smell' },
      stateSlices: { npc: { name: 'Lyra' } },
      knowledgeContext: [],
    });
    expect(result.narrative).toBe('');
    expect(result.diagnostics?.warnings).toBeDefined();
  });
});
```

## Architecture

```text
packages/agents/src/sensory/
├── index.ts           # Re-exports
├── sensory-agent.ts   # Main agent implementation
├── types.ts           # Type definitions
└── README.md          # This file

packages/schemas/src/character/
├── body.ts            # Body region taxonomy & aliases
└── index.ts           # Re-exports
```

## Related Documentation

- [Body Map and Sensory System](../../../../dev-docs/19-body-map-and-sensory-system.md)
- [Character Schema](../../../../dev-docs/02-character-schema.md)
- [Agent IO Contracts](../../../../dev-docs/13-agent-io-contracts.md)
