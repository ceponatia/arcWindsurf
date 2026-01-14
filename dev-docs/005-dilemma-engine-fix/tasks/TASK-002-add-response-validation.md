# TASK-002: Add Response Validation

**Priority**: P0 - Immediate
**Estimate**: 30 minutes
**Depends On**: None

---

## Objective

Add validation to detect and reject obviously invalid LLM responses (code, data, technical content) before they reach the user.

## File to Create

### `packages/actors/src/studio-npc/validation.ts`

```typescript
/**
 * Validation utilities for LLM responses.
 * Catches training data leakage, code injection, and malformed responses.
 */

/**
 * Markers that indicate code or technical content.
 */
const CODE_MARKERS = [
  '```',           // Markdown code blocks
  'import ',       // Python/JS imports
  'from ',         // Python imports
  'def ',          // Python function definitions
  'class ',        // Class definitions
  'function ',     // JS function definitions
  'const ',        // JS variable declarations
  'let ',          // JS variable declarations
  'var ',          // JS variable declarations
  '<jupyter',      // Jupyter notebook markers
  '<script',       // HTML script tags
  '</script>',
  'console.log',   // Debug statements
  'print(',        // Python print
  'return ',       // Return statements
  '=>',            // Arrow functions
];

/**
 * Markers that indicate data leakage from training.
 */
const DATA_LEAKAGE_MARKERS = [
  'kaggle',
  'dataset',
  'dataframe',
  'pandas',
  'numpy',
  'sklearn',
  'matplotlib',
  'tensorflow',
  'pytorch',
  'csv',
  'json.parse',
  'api key',
  'bearer token',
  'localhost:',
  'http://',
  'https://',
];

/**
 * Check if a response appears to be valid character dialogue.
 */
export function isValidCharacterResponse(response: string): boolean {
  if (!response || typeof response !== 'string') {
    return false;
  }

  const lowerResponse = response.toLowerCase();

  // Check minimum/maximum length
  if (response.length < 20) {
    console.warn('[Validation] Response too short:', response.length);
    return false;
  }

  if (response.length > 10000) {
    console.warn('[Validation] Response too long:', response.length);
    return false;
  }

  // Check for code markers
  for (const marker of CODE_MARKERS) {
    if (response.includes(marker)) {
      console.warn('[Validation] Found code marker:', marker);
      return false;
    }
  }

  // Check for data leakage markers
  for (const marker of DATA_LEAKAGE_MARKERS) {
    if (lowerResponse.includes(marker)) {
      console.warn('[Validation] Found data leakage marker:', marker);
      return false;
    }
  }

  // Check for excessive special characters (likely code or data)
  const specialCharRatio = (response.match(/[{}[\]();=<>]/g) ?? []).length / response.length;
  if (specialCharRatio > 0.05) {
    console.warn('[Validation] High special character ratio:', specialCharRatio);
    return false;
  }

  // Check for excessive numbers (likely data)
  const numberRatio = (response.match(/\d/g) ?? []).length / response.length;
  if (numberRatio > 0.15) {
    console.warn('[Validation] High number ratio:', numberRatio);
    return false;
  }

  return true;
}

/**
 * Detailed validation result with reason.
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
  markers?: string[];
}

/**
 * Get detailed validation result.
 */
export function validateCharacterResponse(response: string): ValidationResult {
  if (!response || typeof response !== 'string') {
    return { valid: false, reason: 'Empty or invalid response' };
  }

  if (response.length < 20) {
    return { valid: false, reason: 'Response too short' };
  }

  if (response.length > 10000) {
    return { valid: false, reason: 'Response too long' };
  }

  const foundMarkers: string[] = [];

  for (const marker of CODE_MARKERS) {
    if (response.includes(marker)) {
      foundMarkers.push(`code:${marker}`);
    }
  }

  const lowerResponse = response.toLowerCase();
  for (const marker of DATA_LEAKAGE_MARKERS) {
    if (lowerResponse.includes(marker)) {
      foundMarkers.push(`data:${marker}`);
    }
  }

  if (foundMarkers.length > 0) {
    return {
      valid: false,
      reason: 'Contains code or data markers',
      markers: foundMarkers,
    };
  }

  const specialCharRatio = (response.match(/[{}[\]();=<>]/g) ?? []).length / response.length;
  if (specialCharRatio > 0.05) {
    return {
      valid: false,
      reason: `High special character ratio: ${(specialCharRatio * 100).toFixed(1)}%`,
    };
  }

  const numberRatio = (response.match(/\d/g) ?? []).length / response.length;
  if (numberRatio > 0.15) {
    return {
      valid: false,
      reason: `High number ratio: ${(numberRatio * 100).toFixed(1)}%`,
    };
  }

  return { valid: true };
}
```

## Files to Modify

### `packages/actors/src/studio-npc/index.ts`

Add export:

```typescript
export { isValidCharacterResponse, validateCharacterResponse } from './validation.js';
```

## Acceptance Criteria

- [ ] `isValidCharacterResponse()` returns false for code
- [ ] `isValidCharacterResponse()` returns false for data leakage
- [ ] `isValidCharacterResponse()` returns true for valid dialogue
- [ ] `validateCharacterResponse()` provides detailed failure reasons
- [ ] Exported from package index

## Test Cases

```typescript
// Should pass
isValidCharacterResponse("*sighs heavily* I... I don't know what to say."); // true

// Should fail - code
isValidCharacterResponse("```python\nprint('hello')\n```"); // false
isValidCharacterResponse("import numpy as np"); // false

// Should fail - data
isValidCharacterResponse("The kaggle dataset contains..."); // false
isValidCharacterResponse("df = pd.read_csv('file.csv')"); // false

// Should fail - too short
isValidCharacterResponse("Hi"); // false

// Should fail - special chars
isValidCharacterResponse("{}[](){}[](){}[]()"); // false
```
