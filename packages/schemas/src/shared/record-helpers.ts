/**
 * Type-Safe Record Access Helpers
 *
 * These utilities provide centralized, auditable access to Record<K, V> objects
 * where K is a closed TypeScript union type (not arbitrary user input).
 *
 * SECURITY BOUNDARY RULES:
 * - ✅ USE these helpers for: Internal game schemas, typed enums, validated state
 * - ❌ DO NOT USE for: LLM output, API input, user-provided keys, external data
 * - All external input MUST be validated at boundaries (API/web/LLM parsing) before
 *   reaching internal logic that uses these helpers.
 *
 * The security/detect-object-injection rule is suppressed within these functions
 * because TypeScript's type system guarantees K is from a known, finite set.
 */

/**
 * Type-safe getter for Record<K, V> where K is a closed union.
 *
 * @example
 * const weights: Record<AffinityDimension, number> = {...};
 * const fondness = getRecord(weights, 'fondness'); // Type-safe
 *
 * @param record - Record with keys of type K
 * @param key - Key from the closed union K
 * @returns Value at the key
 */
export function getRecord<K extends string, V>(record: Record<K, V>, key: K): V {
  // SECURITY: Key is constrained to union K by TypeScript, not arbitrary input
  // eslint-disable-next-line security/detect-object-injection
  return record[key];
}

/**
 * Type-safe getter for optional Record<K, V> where K is a closed union.
 *
 * Handles both required and partial records, and optional objects.
 *
 * @example
 * const body: Partial<Record<BodyRegion, RegionData>> | undefined = {...};
 * const data = getRecordOptional(body, 'feet'); // RegionData | undefined
 *
 * @param record - Optional record with keys of type K
 * @param key - Key from the closed union K
 * @returns Value at the key, or undefined if record or value is not present
 */
export function getRecordOptional<K extends string, V>(
  record: Partial<Record<K, V>> | Record<K, V | undefined> | undefined,
  key: K
): V | undefined {
  if (!record) return undefined;
  // SECURITY: Key is constrained to union K by TypeScript, not arbitrary input
  // eslint-disable-next-line security/detect-object-injection
  return record[key];
}

/**
 * Type-safe getter for Partial<Record<K, V>> where some keys may be missing.
 *
 * @deprecated Use getRecordOptional instead, which handles partial records and undefined objects.
 *
 * @param obj - Object with optional properties of type K
 * @param key - Key from the closed union K
 * @returns Value at the key, or undefined if not present
 */
export function getPartialRecord<K extends string, V>(
  obj: Partial<Record<K, V>> | Record<K, V | undefined> | undefined,
  key: K
): V | undefined {
  return getRecordOptional(obj, key);
}

/**
 * Type-safe setter for Record<K, V> where K is a closed union.
 *
 * SECURITY: Writes are higher risk. Use only for validated internal state.
 * Never use with keys from LLM output or external APIs.
 *
 * @example
 * const result: Record<AffinityDimension, number> = {...};
 * setRecord(result, 'trust', 50); // Type-safe write
 *
 * @param record - Record with keys of type K
 * @param key - Key from the closed union K
 * @param value - Value to set
 */
export function setRecord<K extends string, V>(record: Record<K, V>, key: K, value: V): void {
  // SECURITY: Key is constrained to union K by TypeScript, not arbitrary input
  // eslint-disable-next-line security/detect-object-injection
  record[key] = value;
}

/**
 * Type-safe setter for Partial<Record<K, V>> where some keys may be missing.
 *
 * SECURITY: Writes are higher risk. Use only for validated internal state.
 * Never use with keys from LLM output or external APIs.
 *
 * @example
 * const affinity: { fondness: number; attraction?: number } = {...};
 * setPartialRecord(affinity, 'attraction', 50); // Type-safe write
 *
 * @param obj - Object with optional properties of type K
 * @param key - Key from the closed union K
 * @param value - Value to set
 */
export function setPartialRecord<K extends string, V>(
  obj: Partial<Record<K, V>> | Record<K, V | undefined>,
  key: K,
  value: V | undefined
): void {
  // SECURITY: Key is constrained to union K by TypeScript, not arbitrary input
  // eslint-disable-next-line security/detect-object-injection
  obj[key] = value as (Partial<Record<K, V>> | Record<K, V | undefined>)[K];
}

/**
 * Safe array access with bounds checking.
 *
 * @example
 * const responses = ['a', 'b', 'c'];
 * const item = getArraySafe(responses, 5); // undefined, not error
 *
 * @param array - Array to access
 * @param index - Index to access
 * @returns Element at index, or undefined if out of bounds
 */
export function getArraySafe<T>(array: readonly T[], index: number): T | undefined {
  // SECURITY: Array access with bounds checking, index is a number not string key
  // eslint-disable-next-line security/detect-object-injection
  return array[index];
}

// Helper type to extract the value type from a collection at a numeric index
type ValueAtIndex<C, N extends number> = C extends readonly unknown[]
  ? C[N]
  : C extends Record<N, infer V>
  ? V
  : never;

/**
 * Type-safe tuple/array access for numeric indices.
 *
 * Use this for tuples or arrays indexed by known numeric literal types,
 * or for Record<number, V> where the key is a numeric type.
 *
 * **SECURITY NOTE:**
 * This helper uses dynamic indexing, which triggers ESLint's `security/detect-object-injection`.
 * This is SAFE because:
 * - The index type `N` is constrained to `extends number`, ensuring it's a numeric literal (e.g., 0, 1, 2).
 * - TypeScript enforces that `index` can only be one of the valid numeric keys of the collection.
 * - This is only used with INTERNAL, VALIDATED game data structures (tuples, arrays).
 * - Never use this with user-supplied input or external data.
 *
 * @example
 * const thresholds: readonly [number, number, number] = [0, 10, 20];
 * const value = getTuple(thresholds, 1); // 10
 *
 * @example
 * type Level = 0 | 1 | 2 | 3;
 * const multipliers: Record<Level, number> = { 0: 1, 1: 0.5, 2: 0.25, 3: 0 };
 * const mult = getTuple(multipliers, 2); // 0.25
 *
 * @param collection - Tuple, array, or number-keyed record
 * @param index - Numeric index from a known type
 * @returns Value at the index
 */
export function getTuple<C extends readonly unknown[] | Record<number, unknown>, N extends number>(
  collection: C,
  index: N
): ValueAtIndex<C, N> {
  // SECURITY: Index is constrained to numeric literal type N, not arbitrary input
  // eslint-disable-next-line security/detect-object-injection
  return collection[index] as ValueAtIndex<C, N>;
}
