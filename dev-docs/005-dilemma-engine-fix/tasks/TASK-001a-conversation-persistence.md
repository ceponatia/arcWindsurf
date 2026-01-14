# TASK-001a: Investigate Conversation Persistence vs UI State

**Priority**: P0 - Critical (related to dilemma bug)
**Estimate**: 1-2 hours investigation + implementation
**Depends On**: TASK-001

---

## Problem Statement

The conversation history appears to be stored in the database but is **not reflected in the UI** after page reload. This creates a mismatch:

- **UI**: Shows fresh/empty conversation
- **DB**: Contains full conversation history from previous session
- **LLM Call**: May be receiving the full DB conversation history, not just what the user sees

This is likely contributing to the dilemma engine bug, as the LLM may be receiving accumulated context that the user cannot see or control.

## Investigation Questions

1. Is the full conversation history being sent to the LLM even after UI refresh?
2. How is the session ID managed? Is it persisted in localStorage/sessionStorage?
3. What triggers conversation restoration vs starting fresh?
4. Is summarization working correctly with the hidden history?

## Proposed Solutions

### Option 1: Clear Conversation on Page Reload

**Behavior**: Each page load starts a fresh conversation.

**Pros**:
- Simple and predictable
- User always knows what context the LLM has
- No hidden state

**Cons**:
- Loses ability to continue conversations
- Testing becomes repetitive

**Implementation**:
- Delete or ignore DB session on frontend initialization
- OR create new session ID on each page load

### Option 1a: Preserve in DB for Debugging, Start Fresh in UI

**Behavior**: DB keeps conversation for 24h TTL (debugging/error checking), but UI always starts fresh session.

**Pros**:
- Preserves debug data
- Predictable user experience
- No hidden context sent to LLM

**Cons**:
- DB accumulates orphaned sessions
- Can't continue previous conversations

**Implementation**:
- Generate new session ID on each page load
- Previous sessions remain in DB until TTL expires
- Could add admin endpoint to view/delete old sessions

### Option 2: Conversation List in UI

**Behavior**: Show list of stored conversations, allow user to select, continue, or delete.

**Pros**:
- Full control for users
- Great for testing (can replay scenarios)
- No hidden state
- Matches familiar chat app UX

**Cons**:
- More complex UI work
- Need to handle session selection flow

**Implementation**:
- Add `/studio/sessions` endpoint to list user's sessions
- Add UI component to show session list with:
  - Session name/timestamp
  - Message count
  - Continue button
  - Delete button
- "New Conversation" button creates fresh session

### Option 3: Auto-Continue with Clear Indicator (Recommended Hybrid)

**Behavior**: On page load, check for existing session. If found, show indicator and option to continue or start fresh.

**Pros**:
- Explicit user choice
- No hidden state
- Quick to implement

**Cons**:
- Extra click for returning users

**Implementation**:
- On CharacterStudio mount, check if session exists for character
- If yes, show modal/banner: "Continue previous conversation? (X messages)" with "Continue" | "Start Fresh" buttons
- If no, proceed normally

---

## Investigation Code Locations

### Session Management

| Location | Purpose |
|----------|---------|
| `packages/web/src/features/character-studio/hooks/useConversation.ts` | Frontend session handling |
| `packages/web/src/features/character-studio/services/llm.ts` | API calls with session ID |
| `packages/api/src/routes/studio.ts` | Session restoration from DB |
| `packages/db/src/queries/studio-sessions.ts` | DB queries for sessions |

### Session ID Storage

Check where `studioSessionId` is stored:
- `localStorage`?
- `sessionStorage`?
- URL param?
- React state only?

### LLM Message Construction

In `studio-machine.ts`:

```typescript
// Line ~399-408
messages.push(...contextWindow.map(m => ({
  role: (m.role === 'character' ? 'assistant' : 'user') as LLMMessage['role'],
  content: m.content,
})));
```

The `contextWindow` comes from `ConversationManager.getContextWindow()` which uses `ctx.conversation` - need to trace where this is populated.

---

## Immediate Investigation Steps

1. **Add logging** to see what conversation is loaded on page refresh:

   ```typescript
   // In useConversation.ts or CharacterStudio component
   console.log('[ConversationDebug] Session ID on mount:', studioSessionId.value);
   console.log('[ConversationDebug] Conversation length:', messages.value.length);
   ```

2. **Check session restoration** in `studio.ts`:

   ```typescript
   // Line ~489-499 in /studio/dilemma endpoint
   actor.restoreState({
     conversation: session.conversation.map(...),
     ...
   });
   ```

3. **Verify what LLM receives** (already added in TASK-001):
   - `[DilemmaDebug] Full messages array` log will show if old conversation is being included

---

## Acceptance Criteria

- [ ] User can see and control what conversation context the LLM receives
- [ ] No hidden conversation state sent to LLM
- [ ] Clear path for testing: easy to start fresh or continue
- [ ] Conversation history preserved for debugging (24h TTL)
- [ ] UI accurately reflects conversation state

## Recommendation

Start with **Option 1a** (fresh session on reload, preserve DB for debugging) as a quick fix, then implement **Option 2** (conversation list UI) for full user control. This gives us:

1. **Immediate fix**: Predictable behavior, no hidden LLM context
2. **Future enhancement**: Full conversation management for thorough testing
