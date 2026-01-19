# Character Studio Chat Expansion Plan

## Overview

Expand the Character Studio chat functionality to provide a more engaging and thorough conversation experience before saving characters. This includes message history management, conversation summarization, and an enhanced system prompt.

## Current Implementation

### Frontend (`packages/web/src/features/character-studio/`)

- `signals.ts`: `conversationHistory` signal stores all messages (no limit)
- `hooks/useConversation.ts`: Sends full history to API on each message
- `services/llm.ts`: Calls `/studio/generate` with profile, history, userMessage
- `components/conversation/`: UI components for chat display

### Backend (`packages/api/src/routes/`)

- `studio.ts`: Handles `/studio/generate` and `/studio/infer-traits` endpoints
- `studio/prompts.ts`: Builds system prompt from character profile
  - Current prompt is functional but minimal
  - Focus on consistency, not engagement

### Issues

1. **No message limit**: Full history sent every request (token inefficiency)
2. **Basic system prompt**: "Stay consistent" without visceral engagement guidance
3. **No summarization**: Long conversations waste tokens or hit limits
4. **No delete UI in Character Studio**: Only available in CharactersPanel

## Proposed Changes

### Feature 1: 20-Message History Window

Send only the most recent 20 messages to the LLM, keeping older messages in local state for display.

**Files to modify:**

- `hooks/useConversation.ts` - Slice history before sending
- `services/llm.ts` - Accept optional `maxMessages` parameter

### Feature 2: Conversation Summarization

When conversation exceeds 20 messages, summarize older messages into a context block that's prepended to the history.

**Approach options:**

1. **Client-side trigger**: Frontend detects threshold, requests summary
2. **Server-side auto**: API summarizes when history length exceeds limit
3. **Shared utility**: Reuse summarization from main game system

**Recommendation**: Option 3 - Create a shared summarization service in `@minimal-rpg/services` or `@minimal-rpg/llm` that both character-studio and main game can use.

**Files to create/modify:**

- `packages/llm/src/summarize.ts` (new) - Shared summarization utility
- `packages/api/src/routes/studio.ts` - Add `/studio/summarize` endpoint
- `signals.ts` - Add `conversationSummary` signal
- `hooks/useConversation.ts` - Trigger summarization at threshold

### Feature 3: Enhanced System Prompt

Expand the character system prompt to encourage more engaging, visceral roleplay.

**Current prompt style:**

```text
You are roleplaying as the character described below. Stay consistent with these details.
[Response Rules]
- Speak in first person as this character.
- Let personality traits influence tone, pacing, and word choice.
```

**Enhanced prompt additions:**

- Encourage sensory details and emotional reactions
- Guide character voice based on speech style settings
- Add example dialogue patterns
- Include engagement hooks (curiosity, vulnerability, humor)

**File to modify:**

- `packages/actors/src/studio-npc/prompts.ts` - Expand `buildStudioSystemPrompt()`

### Feature 4: Character Deletion (Side Task)

Re-implement character deletion in Character Studio UI.

**Current state:**

- `services/api.ts` exports `removeCharacter` (already wired to API)
- `CharactersPanel.tsx` has working delete with confirmation
- Character Studio has no delete button

**Implementation:**

- Add delete button to `StudioHeader.tsx`
- Confirm before deletion
- Navigate away after successful delete

## Architecture Decisions

### Summarization Placement

| Option | Pros | Cons |
|--------|------|------|
| `@minimal-rpg/llm` | Close to LLM calls, reusable | Package is low-level |
| `@minimal-rpg/services` | Domain logic home | May not fit service pattern |
| `packages/api/src/services/` | API-specific, simple | Not shareable with game |

**Decision**: Place in `@minimal-rpg/llm` as a utility alongside the provider classes.

### Summary Storage

- Store summary in `conversationSummary` signal (client-side)
- Include summary as first "system" message when calling API
- Don't persist summary to database (ephemeral to studio session)

### Message Counting

- Count only user + character messages (exclude system messages)
- Threshold: 20 messages triggers summarization
- Keep most recent 10 messages after summarization, summarize older 10+

## Files to Modify

```text
packages/llm/
└── src/
    └── summarize.ts              # NEW: Shared summarization utility

packages/api/src/routes/
├── studio.ts                     # Add /studio/summarize endpoint
└── studio/
    # Prompt building lives in @minimal-rpg/actors

packages/web/src/features/character-studio/
├── signals.ts                    # Add conversationSummary signal
├── hooks/
│   └── useConversation.ts        # Add summarization trigger, limit history
├── services/
│   └── llm.ts                    # Add summarizeConversation() call
└── components/
    └── StudioHeader.tsx          # Add delete button
```

## Out of Scope

- Tool calling / function calling (reserved for main game)
- Persistent conversation history (not saved with character)
- Multi-turn inference (already exists via `inferTraitsFromMessage`)
- Streaming responses (already supported via `/studio/generate/stream`)

## Success Criteria

- [ ] Only 20 most recent messages sent to LLM
- [ ] Conversation summarization triggers at threshold
- [ ] Summary provides context without full history
- [ ] Enhanced system prompt produces more engaging responses
- [ ] Character deletion works from Studio UI
- [ ] No regression in trait inference

## Related Tasks

- TASK-001: Implement 20-message history window
- TASK-002: Create shared summarization utility
- TASK-003: Add summarization endpoint and trigger
- TASK-004: Enhance character system prompt
- TASK-005: Add delete button to StudioHeader
