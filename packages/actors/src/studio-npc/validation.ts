/**
 * Validation utilities for LLM responses.
 * Catches training data leakage, code injection, and malformed responses.
 */

import type { ResponseValidationResult } from '@minimal-rpg/schemas';

/**
 * Markers that indicate code or technical content.
 */
const CODE_MARKERS = [
  '```',
  'import ',
  'from ',
  'def ',
  'class ',
  'function ',
  'const ',
  'let ',
  'var ',
  '<jupyter',
  '<script',
  '</script>',
  'console.log',
  'print(',
  'return ',
  '=>',
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

  if (response.length < 20) {
    console.warn('[Validation] Response too short:', response.length);
    return false;
  }

  if (response.length > 10000) {
    console.warn('[Validation] Response too long:', response.length);
    return false;
  }

  for (const marker of CODE_MARKERS) {
    if (response.includes(marker)) {
      console.warn('[Validation] Found code marker:', marker);
      return false;
    }
  }

  for (const marker of DATA_LEAKAGE_MARKERS) {
    if (lowerResponse.includes(marker)) {
      console.warn('[Validation] Found data leakage marker:', marker);
      return false;
    }
  }

  const specialCharRatio =
    (response.match(/[{}[\]();=<>]/g) ?? []).length / response.length;
  if (specialCharRatio > 0.05) {
    console.warn('[Validation] High special character ratio:', specialCharRatio);
    return false;
  }

  const numberRatio = (response.match(/\d/g) ?? []).length / response.length;
  if (numberRatio > 0.15) {
    console.warn('[Validation] High number ratio:', numberRatio);
    return false;
  }

  return true;
}

/**
 * Get detailed validation result.
 */
export function validateCharacterResponse(response: string): ResponseValidationResult {
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

  const specialCharRatio =
    (response.match(/[{}[\]();=<>]/g) ?? []).length / response.length;
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
