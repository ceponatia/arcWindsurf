# TASK-002: Wire LLM to /studio/generate Endpoint

**Priority**: P0
**Estimate**: 2-3 hours
**Depends On**: TASK-001
**Category**: Character Studio LLM Integration

---

## Objective

Replace the placeholder response in `/studio/generate` with actual LLM-powered character responses.

## File to Modify

`packages/api/src/routes/studio.ts`

## Current State

```typescript
// Lines 29-31
// TODO: Integrate with LLM provider
// For now, return a placeholder response
const response = `[Character response to: "${userMessage.slice(0, 50)}..."]`;
```

## Implementation Steps

1. Import OpenAI provider from `@minimal-rpg/llm`
2. Import `buildStudioSystemPrompt` from `@minimal-rpg/actors`
3. Create or access LLM provider instance
4. Build system prompt from profile
5. Format conversation history as LLM messages
6. Call LLM provider's `chat()` method
7. Return response content

## Code Structure

```typescript
import { OpenAIProvider } from '@minimal-rpg/llm';
import { buildStudioSystemPrompt } from '@minimal-rpg/actors';

// Provider initialization using OpenRouter (OpenAI-compatible API)
const llmProvider = new OpenAIProvider({
  id: 'studio',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  baseURL: 'https://openrouter.ai/api/v1',
  model: process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-v3.2',
});

app.post('/studio/generate', async (c) => {
  // ... validation ...

  const systemPrompt = buildStudioSystemPrompt(profile, null);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const result = await Effect.runPromise(llmProvider.chat(messages));
  return c.json({ content: result.content });
});
```

## Acceptance Criteria

- [x] Placeholder response removed
- [x] LLM provider imported and instantiated
- [x] System prompt built from character profile
- [x] Conversation history passed to LLM
- [x] Real LLM response returned to client
- [x] Works with OpenRouter API key configured

## Environment Variables (Already Configured)

- `OPENROUTER_API_KEY` - OpenRouter API key (already in .env)
- `OPENROUTER_MODEL` - Model to use, e.g., `deepseek/deepseek-v3.2` (already in .env)
