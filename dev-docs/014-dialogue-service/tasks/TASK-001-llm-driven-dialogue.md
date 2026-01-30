# TASK-001: Implement LLM-Driven Dialogue Base

**Priority**: P1
**Status**: ✅ Complete
**Estimate**: 8-12 hours
**Depends On**: 013-npc-response-wiring (preferred but not required)
**Category**: Dialogue Service

---

## Objective

Replace the placeholder DialogueService with LLM-driven dialogue using personality-aware prompts and conversation history tracking.

## Current Code

```typescript
// packages/services/src/social/dialogue.ts
static resolveResponse(actorId: string, context: DialogueContext): DialogueResponse {
  // TODO: Implement dialogue tree resolution using actorId and context
  console.debug(`[DialogueService] Resolving dialogue for actor ${actorId}`);
  return {
    content: "I'm listening...",
    options: [],
  };
}
```

## Target Implementation

```typescript
import { CognitionLayer } from '@minimal-rpg/actors';
import { getCharacterProfile } from '@minimal-rpg/db';
import type { LLMProvider } from '@minimal-rpg/llm';

export class DialogueService {
  private static conversationHistory = new Map<string, ConversationMessage[]>();

  static async resolveResponse(
    actorId: string,
    context: DialogueContext,
    llmProvider: LLMProvider
  ): Promise<DialogueResponse> {
    // 1. Get NPC profile
    const profile = await getCharacterProfile(actorId);
    if (!profile) {
      return { content: "...", options: [] };
    }

    // 2. Get conversation history
    const historyKey = `${context.sessionId}-${actorId}`;
    const history = this.conversationHistory.get(historyKey) ?? [];

    // 3. Build dialogue-specific prompt
    const prompt = buildDialoguePrompt(profile, context, history);

    // 4. Generate response via LLM
    const response = await llmProvider.chat([
      { role: 'system', content: DIALOGUE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    // 5. Parse and store response
    const content = response.content ?? "...";
    this.addToHistory(historyKey, 'assistant', content);

    return {
      content,
      options: [], // Future: extract dialogue options
    };
  }

  private static addToHistory(key: string, role: string, content: string): void {
    const history = this.conversationHistory.get(key) ?? [];
    history.push({ role, content, timestamp: new Date() });

    // Keep last 20 messages
    if (history.length > 20) {
      history.shift();
    }

    this.conversationHistory.set(key, history);
  }
}
```

## Implementation Steps

### Step 1: Define Conversation History Type

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

### Step 2: Create Dialogue System Prompt

```typescript
const DIALOGUE_SYSTEM_PROMPT = `You are an NPC in a fantasy RPG. Respond in character based on:
- Your personality traits and speech patterns
- Your current activity and engagement level
- Your relationship with the player
- The conversation history

Keep responses concise (1-3 sentences for casual, up to a paragraph for important topics).
Stay in character. Do not break the fourth wall.
If you don't know something, say so in character.`;
```

### Step 3: Build Context-Aware Prompt

```typescript
function buildDialoguePrompt(
  profile: CharacterProfile,
  context: DialogueContext,
  history: ConversationMessage[]
): string {
  const lines: string[] = [];

  // NPC identity
  lines.push(`You are ${profile.name}.`);

  if (profile.personalityMap?.traits?.length) {
    lines.push(`Traits: ${profile.personalityMap.traits.join(', ')}`);
  }

  if (profile.personalityMap?.speech) {
    const speech = profile.personalityMap.speech;
    if (speech.vocabulary) lines.push(`Vocabulary: ${speech.vocabulary}`);
    if (speech.directness) lines.push(`Directness: ${speech.directness}`);
  }

  if (profile.summary) {
    lines.push(`Background: ${profile.summary}`);
  }

  // Current context
  if (context.topic) {
    lines.push(`Current topic: ${context.topic}`);
  }

  if (context.relationshipLevel !== undefined) {
    const rel = context.relationshipLevel > 50 ? 'friendly'
              : context.relationshipLevel < -50 ? 'hostile'
              : 'neutral';
    lines.push(`Relationship with player: ${rel}`);
  }

  // Conversation history
  if (history.length > 0) {
    lines.push('\nRecent conversation:');
    history.slice(-5).forEach(msg => {
      const speaker = msg.role === 'user' ? 'Player' : profile.name;
      lines.push(`${speaker}: ${msg.content}`);
    });
  }

  // Player's current message
  if (context.history?.length) {
    const lastPlayerMessage = context.history[context.history.length - 1];
    lines.push(`\nPlayer says: "${lastPlayerMessage}"`);
  }

  lines.push('\nRespond in character:');

  return lines.join('\n');
}
```

### Step 4: Update DialogueContext Interface

```typescript
export interface DialogueContext {
  sessionId: string; // Add this
  topic?: string;
  history?: readonly string[];
  relationshipLevel?: number;
  locationId?: string;
}
```

### Step 5: Persist History to DB (Optional Enhancement)

```typescript
// For persistence across server restarts
interface ConversationHistoryRow {
  id: string;
  sessionId: string;
  actorId: string;
  messages: ConversationMessage[];
  updatedAt: Date;
}
```

## Testing

```typescript
describe('DialogueService', () => {
  it('should generate personality-aware response', async () => {
    const mockProvider = createMockLlmProvider({
      response: 'Aye, what can I get ye?'
    });

    const response = await DialogueService.resolveResponse(
      'npc-bartender',
      { sessionId: 'test', topic: 'drinks' },
      mockProvider
    );

    expect(response.content).toBe('Aye, what can I get ye?');
  });

  it('should maintain conversation history', async () => {
    // First message
    await DialogueService.resolveResponse(
      'npc-bartender',
      { sessionId: 'test', history: ['Hello!'] },
      mockProvider
    );

    // Second message should include history in prompt
    await DialogueService.resolveResponse(
      'npc-bartender',
      { sessionId: 'test', history: ['What ales do you have?'] },
      mockProvider
    );

    // Verify history was passed to LLM
    expect(mockProvider.lastPrompt).toContain('Hello!');
  });
});
```

## Acceptance Criteria

- [x] DialogueService uses LLM for response generation
- [x] Personality traits influence response style
- [x] Conversation history is tracked per NPC/session
- [x] History is limited to prevent context overflow (20 messages)
- [x] Response time < 3 seconds (inherits CognitionLayer 2s timeout)
- [x] Graceful fallback on LLM failure (try/catch returns "...")

## Notes

- Consider rate limiting for expensive LLM calls
- History could be summarized for long conversations
- Future: add dialogue options extraction from LLM response
