# TASK-004: Add Streaming Support to Studio Generate

**Priority**: P1
**Estimate**: 2 hours
**Depends On**: TASK-002
**Category**: Character Studio UX Enhancement

---

## Objective

Add SSE streaming support to `/studio/generate` for better UX during LLM response generation.

## Files to Modify

- `packages/api/src/routes/studio.ts`

## Implementation Steps

1. Add new endpoint `/studio/generate/stream` or query param `?stream=true`
2. Use Hono's `streamSSE` helper
3. Call LLM provider's `stream()` method instead of `chat()`
4. Pipe chunks to SSE response
5. Handle stream completion and errors

## Code Structure

```typescript
import { streamSSE } from 'hono/streaming';

app.get('/studio/generate/stream', async (c) => {
  // Parse query params or use POST body
  const { profile, history, userMessage } = /* ... */;

  const systemPrompt = buildStudioSystemPrompt(profile, null);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  return streamSSE(c, async (stream) => {
    const result = await Effect.runPromise(llmProvider.stream(messages));

    for await (const chunk of result) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        await stream.writeSSE({
          data: JSON.stringify({ content: delta }),
          event: 'content',
        });
      }
    }

    await stream.writeSSE({
      data: JSON.stringify({ done: true }),
      event: 'done',
    });
  });
});
```

## Frontend Integration Notes

Client should use EventSource or fetch with ReadableStream:

```typescript
const eventSource = new EventSource('/studio/generate/stream?...');
eventSource.addEventListener('content', (e) => {
  const { content } = JSON.parse(e.data);
  // Append to response display
});
eventSource.addEventListener('done', () => {
  eventSource.close();
});
```

## Acceptance Criteria

- [x] Streaming endpoint available
- [x] LLM stream method used
- [x] Chunks sent as SSE events
- [x] Stream completes with 'done' event (test via script using keys in .env)
- [x] Errors handled and stream closed gracefully
- [x] Works with existing OpenAI/OpenRouter provider
