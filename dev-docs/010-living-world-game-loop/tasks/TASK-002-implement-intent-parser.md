# TASK-002: Implement Intent Parser with LLM

**Priority**: P0
**Estimate**: 4 hours
**Depends On**: TASK-001 (TurnOrchestrator foundation)
**Category**: Living World Game Loop

---

## Objective

Create an `IntentParser` service that uses the LLM to extract game intents from natural language player input.

## Files to Create

- `packages/api/src/services/intent-parser.ts`
- `packages/api/src/services/intent-parser.test.ts`

## Interface Design

```typescript
import type { Intent } from '@minimal-rpg/schemas';
import type { LLMProvider } from '@minimal-rpg/llm';

/**
 * Context provided to help intent parsing.
 */
export interface ParsingContext {
  /** Current location ID */
  locationId: string;
  /** Available exits from current location */
  availableExits: { id: string; name: string; direction: string }[];
  /** NPCs present at current location */
  npcsPresent: { id: string; name: string }[];
  /** Items in player inventory */
  inventory: { id: string; name: string }[];
  /** Items visible in location */
  visibleItems: { id: string; name: string }[];
  /** The NPC the player is currently talking to (if any) */
  focusedNpcId: string | null;
}

/**
 * Result of parsing player input.
 */
export interface ParsedTurn {
  /** Primary action the player wants to take */
  primaryIntent: Intent | null;
  /** What the player said (dialogue content) */
  spokenContent: string | null;
  /** Secondary actions (examine, take, etc.) */
  secondaryIntents: Intent[];
  /** Metadata for response generation */
  meta: {
    /** Is the player asking a question? */
    isQuestion: boolean;
    /** NPCs mentioned by name in the message */
    mentionedNpcs: string[];
    /** Locations mentioned by name in the message */
    mentionedLocations: string[];
  };
}

/**
 * Parses natural language player input into game intents.
 */
export class IntentParser {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Parse player message into structured intents.
   */
  async parse(message: string, context: ParsingContext): Promise<ParsedTurn>;
}
```

## Implementation Steps

### 1. Create System Prompt

```typescript
const INTENT_PARSER_SYSTEM_PROMPT = `You are a game input parser for a text-based RPG. Your job is to extract player intentions from natural language.

Given a player's message and context about their current situation, identify:
1. Actions the player wants to take (move, examine, take, attack, etc.)
2. Dialogue they want to speak to NPCs
3. Any NPCs or locations mentioned

Available intents:
- MOVE_INTENT: Player wants to go somewhere. Extract the destination.
- SPEAK_INTENT: Player wants to say something. This is the default if no action is clear.
- EXAMINE_INTENT: Player wants to look at something closely.
- TAKE_ITEM_INTENT: Player wants to pick up an item.
- DROP_ITEM_INTENT: Player wants to drop an item.
- USE_ITEM_INTENT: Player wants to use an item.
- WAIT_INTENT: Player wants to wait/pass time.

Rules:
1. If the message is clearly dialogue with no action, set primaryIntent to null and extract spokenContent.
2. If the message contains both action and dialogue (e.g., "Let's go to the market, shall we?"), extract both.
3. Match mentioned locations/NPCs to the provided context when possible.
4. If the player's intent is ambiguous, default to SPEAK_INTENT.

Respond in JSON format.`;
```

### 2. Create Output Schema

```typescript
import { z } from 'zod';

const ParsedTurnSchema = z.object({
  primaryIntent: z.union([
    z.object({
      type: z.literal('MOVE_INTENT'),
      destinationId: z.string().optional(),
      destinationName: z.string().optional(),
    }),
    z.object({
      type: z.literal('EXAMINE_INTENT'),
      targetId: z.string().optional(),
      targetName: z.string().optional(),
    }),
    z.object({
      type: z.literal('TAKE_ITEM_INTENT'),
      itemId: z.string().optional(),
      itemName: z.string().optional(),
    }),
    z.object({
      type: z.literal('DROP_ITEM_INTENT'),
      itemId: z.string().optional(),
      itemName: z.string().optional(),
    }),
    z.object({
      type: z.literal('USE_ITEM_INTENT'),
      itemId: z.string().optional(),
      itemName: z.string().optional(),
    }),
    z.object({
      type: z.literal('WAIT_INTENT'),
      duration: z.string().optional(),
    }),
    z.null(),
  ]),
  spokenContent: z.string().nullable(),
  secondaryIntents: z.array(z.any()).default([]),
  meta: z.object({
    isQuestion: z.boolean(),
    mentionedNpcs: z.array(z.string()),
    mentionedLocations: z.array(z.string()),
  }),
});
```

### 3. Build Context Message

```typescript
private buildContextMessage(context: ParsingContext): string {
  const parts: string[] = [];

  parts.push(`Current location: ${context.locationId}`);

  if (context.availableExits.length > 0) {
    parts.push('Available exits:');
    for (const exit of context.availableExits) {
      parts.push(`  - ${exit.name} (${exit.direction})`);
    }
  }

  if (context.npcsPresent.length > 0) {
    parts.push('NPCs present:');
    for (const npc of context.npcsPresent) {
      parts.push(`  - ${npc.name} (id: ${npc.id})`);
    }
  }

  if (context.focusedNpcId) {
    parts.push(`Currently talking to: ${context.focusedNpcId}`);
  }

  if (context.visibleItems.length > 0) {
    parts.push('Visible items:');
    for (const item of context.visibleItems) {
      parts.push(`  - ${item.name} (id: ${item.id})`);
    }
  }

  return parts.join('\n');
}
```

### 4. Implement Parse Method

```typescript
async parse(message: string, context: ParsingContext): Promise<ParsedTurn> {
  const contextMessage = this.buildContextMessage(context);

  const response = await this.llmProvider.chat({
    messages: [
      { role: 'system', content: INTENT_PARSER_SYSTEM_PROMPT },
      { role: 'user', content: `Context:\n${contextMessage}\n\nPlayer message: "${message}"` },
    ],
    responseFormat: { type: 'json_object' },
    maxTokens: 500,
  });

  // Parse and validate response
  const parsed = JSON.parse(response.content);
  const validated = ParsedTurnSchema.parse(parsed);

  // Resolve IDs from names
  return this.resolveReferences(validated, context);
}

private resolveReferences(parsed: ParsedTurn, context: ParsingContext): ParsedTurn {
  // If LLM returned a name but no ID, try to match to context
  if (parsed.primaryIntent?.type === 'MOVE_INTENT') {
    const intent = parsed.primaryIntent;
    if (intent.destinationName && !intent.destinationId) {
      const match = context.availableExits.find(
        e => e.name.toLowerCase() === intent.destinationName?.toLowerCase()
      );
      if (match) {
        intent.destinationId = match.id;
      }
    }
  }

  // Similar for other intent types...
  return parsed;
}
```

### 5. Handle Edge Cases

```typescript
// Fallback if LLM fails
private fallbackParse(message: string): ParsedTurn {
  // Simple heuristic fallback
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.startsWith('go to') || lowerMessage.startsWith('walk to')) {
    return {
      primaryIntent: {
        type: 'MOVE_INTENT',
        destinationName: message.replace(/^(go to|walk to)\s+/i, ''),
      },
      spokenContent: null,
      secondaryIntents: [],
      meta: { isQuestion: false, mentionedNpcs: [], mentionedLocations: [] },
    };
  }

  // Default: treat as dialogue
  return {
    primaryIntent: null,
    spokenContent: message,
    secondaryIntents: [],
    meta: {
      isQuestion: message.includes('?'),
      mentionedNpcs: [],
      mentionedLocations: []
    },
  };
}
```

## Acceptance Criteria

- [ ] `IntentParser` class created with LLM provider injection
- [ ] System prompt accurately describes intent types and parsing rules
- [ ] `parse()` method calls LLM with structured output
- [ ] Response validation using Zod schema
- [ ] Reference resolution (names → IDs) using context
- [ ] Fallback parsing if LLM fails or returns invalid JSON
- [ ] Edge case handling (empty message, ambiguous input)
- [ ] Unit tests with mocked LLM responses

## Test Cases

| Input                                          | Expected Output                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| "Hello!"                                       | `{ primaryIntent: null, spokenContent: "Hello!" }`                            |
| "I walk to the tavern"                         | `{ primaryIntent: MOVE_INTENT(tavern), spokenContent: null }`                 |
| "Let's head to the market. What do you think?" | `{ primaryIntent: MOVE_INTENT(market), spokenContent: "What do you think?" }` |
| "I examine the sword"                          | `{ primaryIntent: EXAMINE_INTENT(sword), spokenContent: null }`               |
| "Pick up the coin"                             | `{ primaryIntent: TAKE_ITEM_INTENT(coin), spokenContent: null }`              |
| "I wait here"                                  | `{ primaryIntent: WAIT_INTENT, spokenContent: null }`                         |

## Notes

- Consider caching parsed intents for repeated similar messages
- LLM response time is critical - use fast tier if available
- May want to add intent confirmation for ambiguous cases
