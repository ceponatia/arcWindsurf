# LLM Package Test Coverage Review

## Scope

Package: `@minimal-rpg/llm`

Focus: providers, streaming helpers, cognition routing/budgeting, tool registry/definitions.

## Existing Tests

- `test/openai-provider.test.ts`
  - Covers tool-call mapping, usage mapping, error when no choices.
  - Verifies streaming path and provider routing, env-based OpenRouter creation, tool-role mapping in requests.
- `test/anthropic-provider.test.ts`
  - Covers system message extraction, first text block extraction, null content when no text.
  - Verifies streaming delta handling.
- `test/ollama-provider.test.ts`
  - Covers tool message mapping to assistant role and default base URL.
- `test/streaming.test.ts`
  - Covers `streamToLines` filtering of empty chunks and `consumeStream` aggregation.
- `test/cognition.test.ts`
  - Covers `TieredCognitionRouter` routing and execution.
  - Covers `TokenBudgetManager` usage tracking, `hasBudget`, and reset.
- `test/tools-registry.test.ts`
  - Covers `ToolRegistry` register/get/getAll and filtering by names.

## Notably Untested or Under-tested Areas

### Providers

- `OpenAIProvider.stream` does not validate tool call mapping for streamed output (tool calls are ignored in current stream path).
- Error handling paths for provider constructors (invalid keys, network errors) are not covered (tests are mocked only).
- `createOpenRouterProviderFromEnv` does not cover provider ordering by `OPENROUTER_PROVIDER_ORDER` (only sort).

### Cognition

- No tests for `TieredCognitionRouter.route` default switch behavior on unexpected task types beyond `vision` fallback.

### Tools

- Tool definition exports in `src/tools/definitions/**` are not validated (schemas, required params, naming consistency).
- No tests for `toolRegistry` singleton usage (only the class).

### Types and Exports

- `src/index.ts` export surface is not validated.
- `src/types.ts` field shape alignment with providers is not covered.

## Suggested Test Additions (Prioritized)

1. Tool definition integrity
   - Validate each tool definition has valid schema shape and unique name.
2. Provider behavior edge cases
   - Ensure `OpenAIProvider` and `AnthropicProvider` handle empty message arrays or missing content fields gracefully.
   - Add tests for OpenRouter provider ordering env var if supported.
3. Export surface checks
   - Simple tests that critical exports are present to prevent regressions.

## Notes

- Provider tests are mocked and deterministic; no real inference occurs (aligned with repo guidance).
