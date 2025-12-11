# Chat History Context and Summarization for Agents

This document describes the design for passing chat history context to NPC agents, and the summarization strategy for managing context window size efficiently.

> **Architecture Note:** As of the Phase 5 redesign (see [archived-agent-orchestration-redesign.md](completed/archived-agent-orchestration-redesign.md)), the Sensory Agent no longer writes prose. It provides structured `SensoryContextForNpc` data that the NPC Agent weaves into its narrative. This makes the NPC Agent the sole prose writer, eliminating the need for conversation history in the Sensory Agent.

## 1. Current State

The system has been updated with the following implementations:

### What's Implemented

1. **NPC Agent conversation history** - Receives last 3 turns in user prompt (see [npc-agent.ts#L501](../packages/agents/src/npc/npc-agent.ts#L501))
2. **Prompt-level summarization** - `buildPrompt()` in [prompt.ts](../packages/api/src/llm/prompt.ts#L179) provides basic character-based summarization of older turns
3. **Configurable history window** - `historyWindow` option (default: 10) controls how many recent turns are kept verbatim
4. **Sensory context as structured data** - Sensory Agent builds `SensoryContextForNpc` (no prose, no history needed)
5. **NPC transcript loader** - Governor loads NPC-specific transcripts via `npcTranscriptLoader` (see [composition.ts](../packages/api/src/governor/composition.ts))

### Remaining Gaps

1. **NPC Agent history window is small** - Only 3 turns in `buildDialogueUserPrompt()`, should be configurable 10-15
2. **No LLM-based summarization** - Current `summarizeHistory()` is character-truncation, not semantic compression
3. **No persistent summary storage** - Need to add `conversation_summary` field to session table
4. **No key fact extraction** - Structured extraction of promises, goals, relationship changes (future enhancement)

## 2. DeepSeek V3 Context Window

Based on official documentation from [HuggingFace DeepSeek-V3](https://huggingface.co/deepseek-ai/DeepSeek-V3):

- **Maximum context window: 128K tokens**
- The model performs well on "Needle in a Haystack" tests across all context window lengths up to 128K
- Via OpenRouter, we're using `deepseek-chat` which supports the full 128K context

### Recommended Token Budget Allocation

For a typical RPG session turn:

| Component                          | Tokens        | Notes                         |
| ---------------------------------- | ------------- | ----------------------------- |
| System prompt (base rules, safety) | ~500-1000     | Fixed cost                    |
| Character profile block            | ~500-1500     | Depends on profile complexity |
| Setting profile block              | ~200-500      | Usually smaller               |
| RAG knowledge context              | ~500-1500     | Retrieved nodes               |
| Sensory context (structured)       | ~200-500      | From SensoryContextBuilder    |
| **Conversation history**           | **4000-8000** | See section 3                 |
| History summary                    | ~1000-2000    | Compressed older context      |
| Current turn input                 | ~100-500      | Player input                  |
| **Reserve for response**           | ~500-1000     | LLM output buffer             |

### Practical Working Budget

Approximately 10,000-15,000 tokens per turn is a reasonable working budget.

We want efficient summarization to:

1. Reduce API costs (tokens = cost)
2. Improve response latency (more tokens = slower)
3. Keep relevant context prioritized

## 3. Conversation History Design

### 3.1 Current Implementation

The codebase supports conversation history at multiple levels:

**AgentInput interface** (in [types.ts](../packages/agents/src/core/types.ts)):

- `conversationHistory?: ConversationTurn[]` - General session history
- `npcConversationHistory?: ConversationTurn[]` - Per-NPC transcript history

**Governor context building:**

- `npcTranscriptLoader` callback loads NPC-specific messages from database
- Governor passes history to agents via `AgentInput`

**NPC Agent usage:**

- `buildDialogueUserPrompt()` uses last 3 turns (hardcoded at [npc-agent.ts#L501](../packages/agents/src/npc/npc-agent.ts#L501))
- Should be configurable to 10-15 turns

**Prompt-level summarization:**

- `buildPrompt()` in [prompt.ts](../packages/api/src/llm/prompt.ts) uses `historyWindow` (default: 10)
- `summarizeHistory()` truncates older messages to 500 chars each

### 3.2 Updated History Window Sizes

Per the Phase 5 redesign, only the NPC Agent needs conversation history:

| Agent         | Recent History (verbatim) | Summarized History                        |
| ------------- | ------------------------- | ----------------------------------------- |
| NPC Agent     | 10-15 turns               | All older turns summarized                |
| Sensory Agent | Not needed                | Uses structured data, no history required |

**Rationale:**

- NPC agents need context to maintain character voice, recall promises made, remember player's stated goals, and react to emotional beats
- Sensory agents now provide structured `SensoryContextForNpc` data - they don't write prose and don't need conversation context

### 3.3 Remaining Implementation Changes

#### A. Increase `buildDialogueUserPrompt` History Window

Current code only includes 3 turns. Should use configurable window:

```typescript
// In NpcAgent constructor or config
private readonly historyWindow: number;

constructor(config: NpcAgentConfig = {}) {
  super(config);
  this.historyWindow = config.historyWindow ?? 10;
}

private buildDialogueUserPrompt(input: AgentInput): string {
  const parts: string[] = [];
  const convo = input.npcConversationHistory ?? input.conversationHistory;

  // Add recent conversation history
  if (convo && convo.length > 0) {
    parts.push('Recent conversation:');
    for (const turn of convo.slice(-this.historyWindow)) {
      const speaker = turn.speaker === 'player' ? 'Player' : 'You';
      parts.push(`${speaker}: ${turn.content}`);
    }
    parts.push('');
  }
  // ... rest of method
}
```

#### B. Sensory Agent: No History Needed (Completed)

Per the Phase 5 redesign, the Sensory Agent now returns structured `SensoryContextForNpc` data instead of prose. The NPC Agent receives this context and weaves sensory details into its narrative. No conversation history is needed for the Sensory Agent.

## 4. Summarization Design

### 4.1 Current Implementation

The codebase has basic character-based summarization in `buildPrompt()`:

```typescript
// In packages/api/src/llm/prompt.ts
function summarizeHistory(messages: DbMessage[], keepLast: number, maxChars: number) {
  if (messages.length <= keepLast) return '';
  const older = messages.slice(0, Math.max(0, messages.length - keepLast));

  // Prioritize the most recent of the "older" messages by processing in reverse
  const reversedOlder = [...older].reverse();
  const keyPoints: string[] = [];
  let currentLen = 0;

  for (const m of reversedOlder) {
    const prefix = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Narration' : 'System';
    const content = m.content.replace(/\s+/g, ' ');
    const line = content.length > 500 ? content.slice(0, 499) + '…' : content;
    const entry = `${prefix}: ${line}`;

    if (currentLen + entry.length + 1 > maxChars) break;

    keyPoints.push(entry);
    currentLen += entry.length + 1;
  }

  return keyPoints.reverse().join('\n');
}
```

This is simple character truncation - not semantic summarization.

### 4.2 Recommended Approach: Running Summary

Based on research into LangChain's memory implementations and LangGraph's summarization patterns, the **running summary** approach is the established best practice:

#### Why Running Summary (Not Storing All Summaries)

| Approach                                                   | Pros                                                  | Cons                                      |
| ---------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| **Running Summary** (single field, progressively updated)  | Simple storage, constant space, context-aware updates | Loses granularity of individual summaries |
| **Stored Summaries** (all summaries, attach most recent N) | Can reference historical summaries, more flexible     | Grows unbounded, adds complexity          |

**Recommendation:** Use a **single running summary** stored in the session table. This matches LangChain's `ConversationSummaryBufferMemory` pattern which uses a `moving_summary_buffer` field that gets progressively updated.

#### How It Works

1. Keep last 10-15 turns verbatim (the "recent window")
2. When new turns push older turns out of the window, summarize those older turns
3. Merge the new summary INTO the existing running summary
4. The running summary progressively grows with context from the entire conversation

```text
┌─────────────────────────────────────────────────────────────┐
│                   Conversation Buffer                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Running Summary]  ◄── Single field, progressively updated │
│  "Elena and the player met at the tavern. She revealed...   │
│   They traveled to the mines. Player comforted her fears."  │
│                                                              │
│  [Recent Window: Last 10-15 turns verbatim]                 │
│  Turn 16: Player: "Do you hear that sound?"                 │
│  Turn 17: Elena: "I... yes. It's coming from deeper."       │
│  Turn 18: Player: "Let's investigate carefully."            │
│  ... (up to current turn)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 When to Summarize

LLM-based summarization should trigger when:

1. **Turn count threshold**: When message count exceeds history window (10-15 turns)
2. **Token count threshold**: When verbatim history exceeds ~6000 tokens
3. **Session start with existing summary**: Conditionally include if `conversation_summary` field exists

**Trigger Logic:**

```typescript
function shouldSummarize(turnCount: number, historyWindow: number): boolean {
  // Only summarize when we have turns beyond the recent window
  return turnCount > historyWindow;
}

function shouldIncludeSummary(session: Session): boolean {
  // Include summary in context if it exists
  return !!session.conversationSummary?.trim();
}
```

### 4.4 Progressive Summarization Prompt

See section 4.9 for the full per-NPC summarization prompt. The key principles are:

1. **NPC perspective**: Summarize from the specific NPC's viewpoint, not omniscient
2. **Progressive updates**: Build on existing summary rather than regenerating from scratch
3. **Filtered input**: Only include turns the NPC actually witnessed
4. **Character voice**: The summary reflects what the NPC would remember and care about

### 4.5 Summary Strategy Diagram

```text
Turn 1-15:  No summary needed (within recent window)
            [Recent: turns 1-15 verbatim]

Turn 16:    First summarization triggered
            - Summarize turns 1-5 → running_summary v1
            [Summary: v1] + [Recent: turns 6-16 verbatim]

Turn 21:    Update summary
            - Summarize turns 6-10 + merge with v1 → running_summary v2
            [Summary: v2] + [Recent: turns 11-21 verbatim]

Turn 26:    Update summary
            - Summarize turns 11-15 + merge with v2 → running_summary v3
            [Summary: v3] + [Recent: turns 16-26 verbatim]

... and so on
```

### 4.6 Summary Schema

Add to `@minimal-rpg/schemas`:

```typescript
export const ConversationSummarySchema = z.object({
  /** When this summary was last updated */
  updatedAt: z.coerce.date(),

  /** Turn number this summary covers up to */
  coversUpToTurn: z.number(),

  /** The running summary text (progressively updated) */
  summary: z.string(),

  /** Estimated token count of summary */
  summaryTokens: z.number().optional(),
});

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;
```

### 4.7 Storage Design

See section 4.9 for the per-NPC summary storage schema. Key points:

- Summaries stored in `npc_conversation_summaries` table (one row per NPC per session)
- Turns track `npcs_present` array to enable filtering
- Single-NPC sessions have one summary row, multi-NPC sessions have multiple
- Each NPC gets their own running summary from their perspective

### 4.9 Per-NPC Summaries

#### Why Per-NPC (Not Session-Level)

In multi-NPC scenes, different characters have different awareness:

| Scenario                          | Impact                                 |
| --------------------------------- | -------------------------------------- |
| Player talks privately with NPC A | NPC B shouldn't know this              |
| NPC joins scene late              | Doesn't know earlier context           |
| NPC leaves and returns            | Missed intermediate events             |
| Different perspectives            | NPCs interpret same events differently |

Rather than building intermediate systems, we'll implement **per-NPC summaries from the start**. This approach:

- Works for single-NPC sessions (just one summary row)
- Scales naturally to multi-NPC scenes
- Provides accurate character awareness
- Is testable in MVP with single NPC

#### Storage Schema

```sql
CREATE TABLE npc_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES user_sessions(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  covers_up_to_turn INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, npc_id)
);

CREATE INDEX idx_npc_summaries_session ON npc_conversation_summaries(session_id);
CREATE INDEX idx_npc_summaries_npc ON npc_conversation_summaries(npc_id);
```

#### Summarization Flow

When summarizing for a specific NPC:

1. Filter conversation history to turns where that NPC was present
2. Summarize only those turns from the NPC's perspective
3. Store/update the NPC-specific summary

```typescript
interface NpcSummaryContext {
  sessionId: string;
  npcId: string;
  npcName: string;
  existingSummary?: string;
  turnsToSummarize: ConversationTurn[];
}

function buildNpcSummarizationPrompt(ctx: NpcSummaryContext): string {
  const turnsText = ctx.turnsToSummarize
    .map((t) => `${t.speaker === 'player' ? 'Player' : t.speaker}: ${t.content}`)
    .join('\n');

  if (ctx.existingSummary) {
    return `You are summarizing a roleplay conversation from ${ctx.npcName}'s perspective.

${ctx.npcName}'s current memory of events:
${ctx.existingSummary}

New conversation turns ${ctx.npcName} witnessed:
${turnsText}

Extend the summary from ${ctx.npcName}'s perspective. Create a comprehensive summary that:
1. Preserves key information from their existing memory
2. Incorporates new developments they witnessed
3. Reflects their understanding and interpretation of events
4. Stays under 500 words

Return only the updated summary, no commentary:`;
  } else {
    return `You are summarizing a roleplay conversation from ${ctx.npcName}'s perspective.

Conversation ${ctx.npcName} witnessed:
${turnsText}

Create a concise summary from ${ctx.npcName}'s perspective that captures:
1. Key events and interactions they experienced
2. Promises made to or by them
3. Emotional moments and relationship developments
4. Important information they learned
5. Physical context (where they are, what happened)

Keep under 400 words. Focus on what ${ctx.npcName} would remember and care about.
Write as narrative prose from their viewpoint. Return only the summary:`;
  }
}
```

#### Presence Tracking

Each turn should track which NPCs were present to enable filtering:

```typescript
interface StoredTurn {
  id: string;
  sessionId: string;
  turnNumber: number;
  role: 'user' | 'assistant';
  content: string;
  npcsPresent: string[]; // NPC IDs who witnessed this turn
  createdAt: Date;
}
```

When processing turns for summarization:

```typescript
function getTurnsForNpc(allTurns: StoredTurn[], npcId: string, afterTurn: number): StoredTurn[] {
  return allTurns.filter((turn) => turn.turnNumber > afterTurn && turn.npcsPresent.includes(npcId));
}
```

#### Loading Summary for NPC Agent

When building context for an NPC agent:

```typescript
async function loadNpcContext(
  sessionId: string,
  npcId: string,
  historyWindow: number
): Promise<{ summary?: string; recentTurns: ConversationTurn[] }> {
  // Load NPC-specific summary
  const summary = await db.query(
    `SELECT summary, covers_up_to_turn FROM npc_conversation_summaries
     WHERE session_id = $1 AND npc_id = $2`,
    [sessionId, npcId]
  );

  // Load recent turns where this NPC was present
  const recentTurns = await db.query(
    `SELECT * FROM session_messages
     WHERE session_id = $1 AND $2 = ANY(npcs_present)
     ORDER BY turn_number DESC LIMIT $3`,
    [sessionId, npcId, historyWindow]
  );

  return {
    summary: summary?.summary,
    recentTurns: recentTurns.reverse(),
  };
}
```

#### When to Trigger Summarization

For each NPC in a scene, check if summarization is needed after each turn:

```typescript
async function checkNpcSummarization(
  sessionId: string,
  npcId: string,
  historyWindow: number
): Promise<boolean> {
  const summary = await getNpcSummary(sessionId, npcId);
  const turnsAfterSummary = await countTurnsForNpc(sessionId, npcId, summary?.coversUpToTurn ?? 0);

  // Summarize when NPC has witnessed more turns than the window size
  return turnsAfterSummary > historyWindow;
}
```

#### Single-NPC Sessions

For sessions with only one NPC, this system works identically:

- One row in `npc_conversation_summaries` for that NPC
- All turns have that NPC in `npcsPresent`
- Behaves exactly like a session-level summary, just stored per-NPC

This means the MVP can be tested with single-NPC scenarios while the architecture naturally supports multi-NPC later.

### 4.8 Context Injection Logic

When building prompts, conditionally include the summary:

```typescript
function buildContextWithSummary(
  session: Session,
  recentHistory: ConversationTurn[],
  historyWindow: number
): { summary?: string; recentTurns: ConversationTurn[] } {
  const result = {
    recentTurns: recentHistory.slice(-historyWindow),
    summary: undefined as string | undefined,
  };

  // Only include summary if it exists and we have turns beyond the window
  if (session.conversationSummary && recentHistory.length > historyWindow) {
    result.summary = session.conversationSummary;
  }

  return result;
}
```

**In the NPC Agent system prompt:**

```typescript
private buildDialogueSystemPrompt(character: CharacterSlice, input: AgentInput): string {
  const parts: string[] = [];

  parts.push(`You are ${character.name}.`);

  // Conditionally add summary for long conversations
  if (input.conversationSummary) {
    parts.push('\n--- STORY SO FAR ---');
    parts.push(input.conversationSummary);
    parts.push('--- END SUMMARY ---\n');
  }

  // ... rest of existing prompt building
}
```

## 5. Integration with Governor

### 5.1 Current Context Flow

Per the Phase 5 redesign, the Governor orchestrates the following flow:

```text
┌─────────────────────────────────────────────────────────────┐
│                     Turn Processing                         │
├─────────────────────────────────────────────────────────────┤
│  1. Intent Detection (what player wants to do)              │
│  2. Sensory Context Build (DB query, NO LLM)                │
│     → SensoryAgent returns SensoryContextForNpc             │
│  3. Scene State Update (who's present, recent actions)      │
├─────────────────────────────────────────────────────────────┤
│  4. NPC Response Phase (THE prose writing step)             │
│     NPC Agent receives:                                     │
│     - Player's input + intent                               │
│     - Sensory context (structured data from SensoryAgent)   │
│     - Conversation history (recent + summary)               │
│     - NPC's profile (memories, goals, personality)          │
│     NPC writes COMPLETE response including sensory          │
├─────────────────────────────────────────────────────────────┤
│  5. Response Assembly (minimal)                              │
│     - Format multiple NPC responses if needed               │
│     - NO prose rewriting (Phase 5 change)                   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Response Composer (Simplified)

Per Phase 5, the Response Composer no longer rewrites prose. It simply concatenates agent outputs:

```typescript
// In packages/api/src/governor/composition.ts
sharedResponseComposer = ({ executionResult }) => {
  const narratives = executionResult.agentResults
    .filter((r) => r.success && r.output.narrative?.trim())
    .map((r) => r.output.narrative.trim());

  if (narratives.length === 0) return Promise.resolve(undefined);
  if (narratives.length === 1) return Promise.resolve(narratives[0]);

  // Multiple outputs - join with scene dividers
  return Promise.resolve(narratives.join('\n\n---\n\n'));
};
```

### 5.3 Future Context Builder Updates

The `DefaultContextBuilder` should be updated to:

1. Load any existing conversation summary for the session/NPC
2. Include summary in the `TurnContext`
3. Trigger summarization when thresholds are exceeded

```typescript
interface TurnContext {
  // ... existing fields

  /** Pre-computed summary of older conversation history */
  conversationSummary?: ConversationSummary;

  /** Whether summarization should be triggered after this turn */
  needsSummarization?: boolean;
}
```

### 5.4 AgentInput Already Supports History

The `AgentInput` interface already includes history fields and should be extended:

```typescript
export interface AgentInput {
  // ... existing fields

  /** Recent conversation history for context */
  conversationHistory?: ConversationTurn[];

  /** NPC-specific transcript history when addressing a specific NPC */
  npcConversationHistory?: ConversationTurn[];

  /** Structured sensory context for NPC agents to weave into narrative */
  sensoryContext?: SensoryContextForNpc;

  /** Running summary of conversation history beyond the recent window */
  conversationSummary?: string;
}
```

### 5.5 NPC Agent System Prompt Update

Include summary in the system prompt:

```typescript
private buildDialogueSystemPrompt(character: CharacterSlice, input: AgentInput): string {
  const parts: string[] = [];

  parts.push(`You are ${character.name}.`);

  // Add conversation summary for continuity
  if (input.conversationSummary) {
    parts.push('\n--- STORY SO FAR ---');
    parts.push(input.conversationSummary);
    parts.push('--- END SUMMARY ---\n');
  }

  // ... rest of existing prompt building
}
```

## 6. Implementation Roadmap

### Phase 1: Foundation

1. ✅ `npcConversationHistory` is loaded correctly via `npcTranscriptLoader`
2. ⏳ Update NPC agent to use configurable history window (currently hardcoded to 3, should be 10-15)
3. ✅ Sensory Agent uses structured data, no history needed (Phase 5 complete)
4. ⏳ Add `npcs_present` array field to session messages table
5. ⏳ Track NPC presence on each turn (Governor responsibility)

### Phase 2: Per-NPC Summary Implementation

1. ⏳ Create `npc_conversation_summaries` table (see section 4.9)
2. ⏳ Create LLM-based summarization service with NPC-perspective prompt
3. ⏳ Add trigger logic: summarize when NPC-filtered turns exceed history window
4. ⏳ Add `conversationSummary` field to `AgentInput` interface
5. ⏳ Update NPC Agent to conditionally include NPC-specific summary in system prompt
6. ⏳ Implement `loadNpcContext()` to load filtered history + summary

### Phase 3: Optimization (Future)

1. ⏳ Add token-based threshold (summarize when history exceeds ~6000 tokens)
2. ⏳ Add scene-change triggers (location transitions, significant story beats)
3. ⏳ Create background job for post-turn summarization (async, non-blocking)
4. ⏳ Batch summarization for multiple NPCs in same scene

### Phase 4: Key Fact Extraction (Future Enhancement)

1. ⏳ Extract structured facts: promises, goals, relationship changes
2. ⏳ Store key facts as separate JSONB field for quick reference
3. ⏳ Enable semantic search over key facts for RAG retrieval
4. ⏳ Cross-session NPC memory via key fact persistence

## 7. Token Estimation Utilities

Add helper to estimate token counts (rough approximation):

```typescript
/**
 * Estimate token count for text.
 * Uses rough heuristic of ~4 characters per token for English.
 * More accurate: use tiktoken or model-specific tokenizer.
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}

/**
 * Check if conversation history exceeds token budget.
 */
export function needsSummarization(history: ConversationTurn[], maxTokens: number = 6000): boolean {
  const totalChars = history.reduce((sum, t) => sum + t.content.length, 0);
  return estimateTokens(totalChars.toString()) > maxTokens;
}
```

## 8. Configuration

Add to `GovernorOptions`:

```typescript
interface GovernorOptions {
  // ... existing options

  /** Number of recent turns to keep verbatim (default: 10) */
  historyWindowSize?: number;

  /** Max tokens for conversation history before summarization (default: 6000) */
  maxHistoryTokens?: number;

  /** Number of turns between summarization updates (default: 25) */
  summarizationInterval?: number;
}
```

## 9. Testing Strategy

1. **Unit tests** for token estimation and summarization triggers
2. **Integration tests** verifying summary is included in agent prompts
3. **Behavioral tests** checking NPC consistency across long conversations
4. **Load tests** ensuring summarization doesn't add significant latency

## 10. Message Storage Hygiene (System Prompt Separation)

A critical architectural principle: **Instructions (system prompts) should NOT be stored as message history and should NOT be sent with every turn.**

### 10.1 The Problem

If system prompts or instruction fragments leak into stored `assistant` messages, they get replayed to the LLM on every subsequent turn, causing:

1. **Token waste** - Instructions repeated N times for N-turn conversations
2. **Confusion** - LLM sees instruction echoes mixed with dialogue
3. **Context pollution** - Valuable context window filled with redundant instructions

### 10.2 Current Architecture (Correct)

The current architecture correctly separates concerns:

1. **Agent LLM Provider** ([composition.ts](../packages/api/src/governor/composition.ts)):
   - Creates fresh `system` message per agent call
   - Creates `user` message with agent-specific context
   - System prompt is NOT stored - it's ephemeral per call

2. **Response Composer** (Phase 5 redesign):
   - No longer rewrites prose - simple concatenation only
   - NPC Agent is the sole prose writer
   - Sensory Agent provides structured data, not prose

3. **Message Storage** ([turns.ts](../packages/api/src/routes/turns.ts)):
   - Stores `input` as `user` role
   - Stores `turnResult.message` as `assistant` role
   - No system prompts stored

### 10.3 Architecture Principles (Phase 5 Update)

```text
┌─────────────────────────────────────────────────────────────┐
│                    Message Flow Per Turn                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Player Input ─────────► Stored as 'user' message           │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────┐                                        │
│  │ Sensory Agent   │                                        │
│  │ (NO LLM call)   │◄── Returns SensoryContextForNpc        │
│  └────────┬────────┘    (structured data, no prose)         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │ NPC Agent Call  │                                        │
│  ├─────────────────┤                                        │
│  │ [SYSTEM] Fresh  │◄── NOT STORED (ephemeral)              │
│  │ instructions +  │                                        │
│  │ sensory context │                                        │
│  ├─────────────────┤                                        │
│  │ [USER] History  │◄── Includes recent turns (trimmed)     │
│  │ + player input  │                                        │
│  └────────┬────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  NPC Response ───────► Stored as 'assistant' message        │
│  (complete prose with sensory details woven in)             │
│                                                              │
│  NEXT TURN:                                                  │
│  - Fresh system prompt (NOT from history)                   │
│  - Recent 'user'/'assistant' messages (dialogue only)       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.4 What Gets Stored (Correct Behavior)

| Stored         | Example Content                                               | Role        |
| -------------- | ------------------------------------------------------------- | ----------- |
| ✅ Store       | Player typed input: "I walk over and take her hand"           | `user`      |
| ✅ Store       | NPC dialogue/narration: "Elena looks at you with surprise..." | `assistant` |
| ❌ Never Store | System prompts: "You are Elena, a mysterious traveler..."     | N/A         |
| ❌ Never Store | Agent instructions: "Generate sensory description..."         | N/A         |

### 10.5 What Gets Replayed to Agents

When building prompts for the next turn:

```typescript
// Correct pattern: buildPrompt creates fresh system, uses stored conversation
const messages = [
  { role: 'system', content: freshSystemPrompt }, // FRESH, not from DB
  ...storedConversation.map((m) => ({
    // FROM DB, dialogue only
    role: m.role,
    content: m.content, // Should be pure dialogue/narration
  })),
];
```

### 10.6 Validation Points

To ensure this architecture is maintained:

1. **Agent outputs must be pure content** - No instruction echoes
2. **Response composer output must be pure narrative** - No meta-commentary
3. **Stored messages must be trimmed** - Strip any formatting artifacts

If the LLM echoes instructions (rare with good prompting), add post-processing:

```typescript
function sanitizeForStorage(response: string): string {
  // Remove any instruction-like patterns that shouldn't be stored
  return response
    .replace(/^(System:|Instructions?:|Note:|Meta:).*/gim, '')
    .replace(/\[.*?(system|instruction|note).*?\]/gi, '')
    .trim();
}
```

### 10.7 Implementation Checklist

- [x] Verify agent LLM calls use ephemeral system prompts (confirmed in composition.ts)
- [x] Response Composer simplified to concatenation only (Phase 5)
- [x] Sensory Agent returns structured data, not prose (Phase 5)
- [ ] Verify stored `assistant` messages are pure narrative
- [ ] Add optional sanitization if instruction leakage is observed
- [ ] Consider adding `messageType` field to distinguish dialogue vs. narration
- [ ] Audit `buildPrompt` to ensure system messages aren't loaded from history

## 11. Open Questions

### Resolved

- **Running summary vs. all summaries**: Use running summary (progressively updated). This matches LangChain's `ConversationSummaryBufferMemory` pattern.
- **History window size**: 10-15 turns is appropriate for DeepSeek's 128K context window.
- **Multi-NPC scenes**: Use per-NPC summaries from the start (see section 4.9). Each NPC gets their own running summary based on turns they witnessed. Works for single-NPC sessions too (just one summary row).
- **Storage location**: `npc_conversation_summaries` table with one row per NPC per session.

### Remaining Questions

- **LLM for summarization**: Use same model (DeepSeek) or cheaper/faster model for summarization calls?
- **Summarization timing**: Synchronous (block response) or async (post-response background job)?
- **Player preferences**: Should players be able to see/edit summaries for correction?
- **Summary length limits**: What's the optimal max length for running summary before it needs compression itself?
- **Instruction leakage detection**: Should we add runtime checks for instruction patterns in responses?
