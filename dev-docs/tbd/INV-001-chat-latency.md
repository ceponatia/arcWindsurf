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
- [ ] Investigate why non-streaming was 4x slower (XState overhead? Connection pooling?)
