# Utils Package Test Coverage Review

## Scope

Package: `@minimal-rpg/utils`

Focus: cross-package helpers for parsing, errors, HTTP, shared object/id utilities, settings, and LLM adapters.

## Existing Tests

- `test/errors.test.ts`
  - Covers `getErrorMessage` fallback behavior and `isAbortError` for Error instances.
- `test/http.test.ts`
  - Covers `safeText` and `safeJson` happy path and error fallback.
- `test/form-errors.test.ts`
  - Covers `mapZodErrorsToFields` mapping and `getInlineErrorProps` output.
- `test/keywords.test.ts`
  - Covers sensory keyword detection, intensity, temperature, and moisture extraction.
- `test/attribute-parser.test.ts`
  - Covers pattern extraction, LLM fallback, and invalid LLM response handling.
- `test/body-parser.test.ts`
  - Covers scent/texture/visual/flavor parsing, body entry parsing, and formatting.
- `test/body-parser.guard.test.ts`
  - Covers overlong entry guard in `parseBodyEntry`.
- `test/parser-json.test.ts`
  - Covers `parseJson` and `parseJsonWithSchema` failure handling.
- `test/input-parser.test.ts`
  - Covers `parsePlayerInput` segmentation.
- `test/url-sanitizer.test.ts`
  - Covers sanitization, domain checks, Supabase detection, and fallback redaction.
- `test/shared-object.test.ts`
  - Covers `isPlainObject`, `deepMergeReplaceArrays`, `deepClone`, and `deepDiff` basic modification reporting.
- `test/shared-json-patch.test.ts`
  - Covers `extractPathsFromPatches`.
- `test/shared-id-math.test.ts`
  - Covers `generateId`, `generateCompactUuid`, `generateShortId`, `generateLocalId`, `isUuid`, ID coercions, and `clamp`.
- `test/openrouter.test.ts`
  - Covers basic OpenRouter responses, tool calls, error responses, and normalized generation.
- `test/delete-setting.test.ts`
  - Covers delete success and error status handling.
- `test/character-cleanup.test.ts`
  - Covers `pruneBodyMap` removing invalid keys and keeping meta regions.

## Notably Untested or Under-tested Areas

### Shared JSON Utilities

- `safeParseJson`, `tryParseJson`, `extractJsonField`, and `parseWithSchema` are not tested.

### Shared Object Utilities

- `deepDiff` added/removed paths and array-diff behavior are not tested.
- `deepMergeReplaceArrays` behavior when `override` is not a plain object is not tested.

### Shared ID Utilities

- `generatePrefixedId`, `generateInstanceId`, and `generateLocalId` prefix fallback are not tested.

### Errors and HTTP

- `isAbortError` behavior for `DOMException` is not tested.
- `safeText` and `safeJson` edge cases around unexpected response shapes are not tested.

### Body Parser

- `formatters` edge cases for intensity boundaries and empty notes are not tested.
- `parseBodyEntries` warning generation for invalid lines is not tested.

### Attribute Parser

- Pattern extraction coverage is narrow (limited patterns); no tests for multiple matches or repeated patterns.

### URL Sanitizer

- Invalid protocol handling and malformed URL redaction without TypeError are not tested.

### OpenRouter Adapter

- Retry behavior, timeout aborts, provider preferences, and tool choice variations are not tested.

### Settings and Types

- `settings/types.ts`, `errors/types.ts`, `parsers/types.ts`, and `http/types.ts` are placeholders with no tests.

## Suggested Test Additions (Prioritized)

1. Add tests for `shared/json` utilities and `deepDiff` added/removed path reporting.
2. Extend OpenRouter tests to cover retry and timeout paths.
3. Add coverage for `parseBodyEntries` warnings and formatter edge cases.
4. Add tests for `generatePrefixedId`/`generateInstanceId` and prefix fallback.

## Notes

- `parsers/types.ts`, `errors/types.ts`, `http/types.ts`, and `settings/types.ts` are placeholders with no runtime behavior to test.
