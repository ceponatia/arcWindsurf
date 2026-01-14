# TASK-005: Add Error Handling for Studio LLM Calls

**Priority**: P1
**Estimate**: 1 hour
**Depends On**: TASK-002, TASK-003
**Category**: Character Studio Reliability

---

## Objective

Add robust error handling for LLM failures in studio routes to provide graceful degradation and informative error messages.

## Files to Modify

- `packages/api/src/routes/studio.ts`

## Error Scenarios to Handle

1. **LLM API key missing** - Configuration error
2. **LLM API rate limited** - Temporary failure
3. **LLM API timeout** - Network issue
4. **LLM response malformed** - Parsing error
5. **LLM content filtered** - Policy violation

## Implementation Steps

1. Wrap LLM calls in try/catch
2. Detect error types and return appropriate status codes
3. Log errors for debugging
4. Return user-friendly error messages
5. Consider retry logic for transient failures

## Code Structure

```typescript
interface StudioError {
  ok: false;
  error: string;
  code: 'LLM_UNAVAILABLE' | 'RATE_LIMITED' | 'TIMEOUT' | 'PARSE_ERROR' | 'CONFIG_ERROR';
  retryable: boolean;
}

app.post('/studio/generate', async (c) => {
  // Check configuration
  if (!process.env.OPENROUTER_API_KEY) {
    return c.json({
      ok: false,
      error: 'LLM provider not configured',
      code: 'CONFIG_ERROR',
      retryable: false,
    } satisfies StudioError, 503);
  }

  try {
    // ... LLM call ...
  } catch (error) {
    console.error('Studio generate error:', error);

    if (isRateLimitError(error)) {
      return c.json({
        ok: false,
        error: 'Rate limited, please try again shortly',
        code: 'RATE_LIMITED',
        retryable: true,
      } satisfies StudioError, 429);
    }

    if (isTimeoutError(error)) {
      return c.json({
        ok: false,
        error: 'Request timed out',
        code: 'TIMEOUT',
        retryable: true,
      } satisfies StudioError, 504);
    }

    return c.json({
      ok: false,
      error: 'Failed to generate response',
      code: 'LLM_UNAVAILABLE',
      retryable: true,
    } satisfies StudioError, 502);
  }
});
```

## Acceptance Criteria

- [x] Missing API key returns 503 with CONFIG_ERROR
- [x] Rate limit returns 429 with RATE_LIMITED
- [x] Timeout returns 504 with TIMEOUT
- [x] Other LLM errors return 502 with LLM_UNAVAILABLE
- [x] Parse errors in infer-traits return empty array (graceful)
- [x] All errors logged with context
- [x] Error responses include `retryable` flag
