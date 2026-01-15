# Investigation-001 - Character Studio Chat Latency

## Summary

Simple chat requests in character studio take up to 30 seconds to complete. This is extraordinarily long for Deepseek.

---

## Investigation Notes (Jan 14, 2026)

### Data Flow Analysis

```text
Frontend (useConversation.sendMessage)
  ↓ POST /studio/conversation
API (studio.ts)
  ↓ Get/create session from DB
  ↓ Get/create StudioNpcActor
  ↓ actor.chat(message)
StudioMachine (generateResponse actor)
  ↓ Build system prompt (buildStudioSystemPrompt)
  ↓ Get context window (up to 20 messages)
  ↓ await llmProvider.chat(messages)  ← BLOCKING, NO TIMEOUT
OpenAIProvider
  ↓ await client.chat.completions.create(body)  ← NETWORK CALL TO OPENROUTER
```

### Identified Latency Contributors

#### 1. No Timeout Configuration

The `OpenAIProvider` in `@/home/brian/projects/arcWindsurf/packages/llm/src/providers/openai.ts` has **no timeout setting**:

```typescript
this.client = new OpenAI({
  apiKey: config.apiKey,
  baseURL: config.baseURL,
  // No timeout configured!
});
```

The OpenAI SDK defaults to a very long timeout. If OpenRouter/DeepSeek is slow, the request just waits.

#### 2. Non-Streaming Blocking Call

The conversation endpoint uses `llmProvider.chat()` (blocking) instead of `llmProvider.stream()`:

```typescript
// In studio-machine.ts generateResponse actor
const result = await Effect.runPromise(ctx.llmProvider.chat(messages));
```

The user sees nothing until the entire response is generated. With DeepSeek, this can take 15-30 seconds for longer responses.

#### 3. Large System Prompts

The system prompt is built from multiple blocks in `@/home/brian/projects/arcWindsurf/packages/actors/src/studio-npc/prompts.ts`:

| Block | Approximate Size |
|-------|------------------|
| Embodiment | ~400 chars |
| Identity | ~200 chars |
| Story/Backstory | Variable (can be 1000+ chars) |
| Personality | Variable (Big Five + values + fears, etc.) |
| Voice | Variable |
| Engagement | ~500 chars |
| Context Summary | Variable |

**Total system prompt can exceed 3000+ tokens** for a well-filled character profile.

#### 4. Context Window

`ConversationManager.getContextWindow()` returns up to 20 messages. Each message adds to the prompt size, increasing LLM processing time.

#### 5. Model Selection

Default model is `deepseek/deepseek-chat` via OpenRouter:

```typescript
// config.ts
const openrouterModel = env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
```

DeepSeek models are known for thorough reasoning but can have higher latency than alternatives.

### Metrics to Capture

To properly diagnose, we should log:

1. Time from request received → LLM call started
2. Time from LLM call started → LLM response received
3. Total token count (input + output)
4. Model used

---

## Recommendations

### Quick Wins

1. **Add timeout to OpenAI client** (30-60 seconds)

   ```typescript
   this.client = new OpenAI({
     apiKey: config.apiKey,
     baseURL: config.baseURL,
     timeout: 45000, // 45 second timeout
   });
   ```

2. **Log LLM call timing** - Add timestamps around `llmProvider.chat()` calls

3. **Consider streaming** - The streaming endpoint exists but isn't used for conversation

### Medium-Term

4. **Reduce system prompt size** - Compress personality blocks, only include non-default values

5. **Aggressive context windowing** - Reduce from 20 to 10 messages for faster models

6. **Model experimentation** - Test alternatives via OpenRouter:
   - `deepseek/deepseek-chat` (current)
   - `anthropic/claude-3-haiku` (faster, cheaper)
   - `openai/gpt-4o-mini` (fast, good quality)

### Longer-Term

7. **Implement streaming for conversation** - Show response as it generates

8. **Pre-warm actor cache** - Avoid cold start delays

9. **Add telemetry** - Track P50/P95 latencies for monitoring

---

## Next Steps

- ~~[ ] Add timeout configuration to OpenAIProvider~~
  - Not desired because this would likely prevent any responses until we get efficiency improvements
- [x] Add timing logs to generateResponse actor
- [x] Implement streaming for main conversation endpoint
  - **Result:** Reduced total response time from 31s to 7.5s
  - Streaming bypasses XState actor machinery, calls `llmProvider.stream()` directly
  - First token appears in ~1s (perceived latency near-instant)
- ~~[ ] Test with different models to compare latency~~
  - Not planned because DeepSeek is already one of the fastest available chat models with low moderation.
- [x] Investigate why non-streaming was 4x slower (XState overhead? Connection pooling?)
  - **Root cause: Sequential LLM calls in XState flow**

---

## Analysis: Why Non-Streaming Was 4x Slower

### XState Actor Flow (Non-Streaming)

The non-streaming path through `actor.respond()` triggers this XState state machine flow:

```text
idle → responding → inferring → suggesting → idle
         ↓              ↓            ↓
    generateResponse  inferTraits  suggestPrompts
      (LLM #1)        (LLM #2)     (local)
```

**LLM Calls in sequence:**

1. **`generateResponse`** (~7s) - Main character response via `llmProvider.chat()`
2. **`inferTraits`** (~7s) - Trait inference via `TraitInferenceEngine.inferFromExchange()` which calls `llmProvider.chat()` with a separate prompt
3. **`suggestPrompts`** (local) - Uses `DiscoveryGuide` - no LLM call

**Additional potential LLM call:**

- **Conversation summarization** - If `conversationManager.needsSummarization()` returns true (after 20 messages), another LLM call is made

### Timing Breakdown

| Component | Non-Streaming | Streaming |
|-----------|---------------|-----------|
| Main response LLM | ~7s | ~7s |
| Trait inference LLM | ~7s | **skipped** |
| Summarization LLM | ~7s (if triggered) | **skipped** |
| State transitions | ~100ms | ~10ms |
| **Total** | **~14-21s** | **~7s** |

The 31s observed time likely included summarization or network variance.

### What Streaming Bypasses

By calling `llmProvider.stream()` directly, the streaming endpoint **skips**:

| Feature | Impact | Severity |
|---------|--------|----------|
| **Trait inference** | No automatic personality trait detection from responses | Medium - can be added back async |
| **Suggested prompts** | Prompts not dynamically updated after each message | Low - uses static DiscoveryGuide |
| **Conversation summarization** | Long conversations won't be compressed | Medium - affects very long sessions |
| **Actor state machine** | Actor cache invalidated after each call | Low - recreated on next request |
| **onTraitInferred callbacks** | Won't fire | Low - UI handles traits from response |

### Recommendations

1. **Keep streaming for chat** - 4x improvement is worth the tradeoffs
   - Agreed.
2. **Add async trait inference** - Fire-and-forget after streaming completes
   - Agreed, and perhaps a UI toggle near the chat input to enable/disable this feature
3. **Periodic summarization** - Trigger manually or via background job for long sessions
   - So far I haven't had a chat last longer than a few messages because we had issues to fix, so I'm not sure how much overhead this would cost (unless it was being triggered erroneously but we have no evidence of that yet)
4. **Consider hybrid approach** - Stream response, then run inference/summarization in background
   - Summarization in the background is a good idea. It could work like:
     - User has a converasation up to 20 messages in length (10 from user, 10 from npc)
     - When the conversation reaches 20 messages, trigger a background summarization job
     - Rolling window of 20 messages, so we don't lose recent context while the summarization job is happening.
     - When summarization is done, it is added to the front of the conversation history (does not count toward 20 message cap).
