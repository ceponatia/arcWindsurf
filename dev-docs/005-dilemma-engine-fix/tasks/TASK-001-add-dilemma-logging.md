# TASK-001: Add Comprehensive Logging to Dilemma Flow

**Priority**: P0 - Immediate
**Estimate**: 20 minutes
**Depends On**: None

---

## Objective

Add detailed logging throughout the dilemma flow to capture the exact state when the bug occurs, enabling root cause analysis.

## Files to Modify

### 1. `packages/actors/src/studio-npc/studio-machine.ts`

Add logging in `generateResponse` actor:

```typescript
generateResponse: fromPromise(async ({ input }) => {
  const ctx = input as StudioMachineContext;

  // ... existing code ...

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Special case: if last message is a dilemma
  const lastMsg = ctx.conversation[ctx.conversation.length - 1];
  if (lastMsg && lastMsg.role === 'system' && lastMsg.content.startsWith('[DILEMMA]')) {
    const scenario = lastMsg.content.replace('[DILEMMA]: ', '');
    console.log('[DilemmaDebug] Dilemma scenario detected:', scenario);
    messages.push({
      role: 'system',
      content: buildDilemmaPrompt(scenario, ['your core values', 'the situation at hand'])
    });
  }

  messages.push(...contextWindow.map(m => ({
    role: (m.role === 'character' ? 'assistant' : 'user') as LLMMessage['role'],
    content: m.content,
  })));

  // ADD: Log full message array
  console.log('[DilemmaDebug] Full messages array:', JSON.stringify(messages.map(m => ({
    role: m.role,
    contentLength: m.content.length,
    contentPreview: m.content.slice(0, 200) + (m.content.length > 200 ? '...' : '')
  })), null, 2));

  const result = await Effect.runPromise(ctx.llmProvider.chat(messages));

  // ADD: Log response
  console.log('[DilemmaDebug] LLM response length:', result.content?.length ?? 0);
  console.log('[DilemmaDebug] LLM response preview:', result.content?.slice(0, 300));

  return { content: result.content ?? '', thought: undefined };
}),
```

Add logging in `setDilemmaResponse` action:

```typescript
setDilemmaResponse: assign({
  conversation: ({ context, event }) => {
    const dilemma = (event as unknown as { output: Dilemma }).output;

    // ADD: Log dilemma details
    console.log('[DilemmaDebug] Generated dilemma:', JSON.stringify(dilemma, null, 2));

    const newMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `[DILEMMA]: ${dilemma.scenario}`,
      timestamp: new Date(),
    };
    return [...context.conversation, newMessage];
  },
}),
```

### 2. `packages/api/src/routes/studio.ts`

Add logging in `/studio/dilemma` endpoint:

```typescript
app.post('/studio/dilemma', async (c) => {
  try {
    const body: unknown = await c.req.json();
    const parsed = DilemmaRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ ok: false, error: 'Invalid request' }, 400);
    }

    const { sessionId, profile } = parsed.data;

    // ADD: Log request
    console.log('[DilemmaAPI] Request received:', {
      sessionId,
      profileName: profile.name,
      conversationLength: profile.conversationHistory?.length ?? 'N/A'
    });

    // ... existing actor logic ...

    const response = await actor.requestDilemma();

    // ADD: Log response before returning
    console.log('[DilemmaAPI] Response generated:', {
      responseLength: response.response?.length ?? 0,
      responsePreview: response.response?.slice(0, 200),
      hasInferredTraits: response.inferredTraits?.length ?? 0
    });

    // ... rest of endpoint ...
  } catch (error) {
    console.error('[DilemmaAPI] Error:', error);
    return c.json({ ok: false, error: 'Failed to generate dilemma' }, 500);
  }
});
```

## Acceptance Criteria

- [ ] Console logs show full message array structure before LLM call
- [ ] Console logs show generated dilemma scenario
- [ ] Console logs show LLM response preview
- [ ] Console logs show API request/response summary
- [ ] Logs use `[DilemmaDebug]` or `[DilemmaAPI]` prefix for easy filtering

## Testing

1. Start dev servers
2. Open Character Studio
3. Create character and start conversation
4. Click "⚖️ Test Moral Dilemma"
5. Check server console for `[DilemmaDebug]` and `[DilemmaAPI]` logs
6. Capture full log output for analysis
