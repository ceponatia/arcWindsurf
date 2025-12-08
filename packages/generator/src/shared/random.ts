/**
 * Shared random selection utilities.
 */

import type { ValuePool, WeightedValue } from '../types.js';

/**
 * Check if a pool contains weighted values.
 */
function isWeightedPool<T>(pool: ValuePool<T>): pool is readonly WeightedValue<T>[] {
  return pool.length > 0 && typeof pool[0] === 'object' && 'weight' in (pool[0] as object);
}

/**
 * Pick a random item from an array.
 */
export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

/**
 * Pick a random item from a weighted pool.
 * Higher weights = higher probability.
 */
export function pickWeighted<T>(items: readonly WeightedValue<T>[]): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty weighted pool');
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item.value;
    }
  }

  // Fallback to last item (shouldn't happen with valid weights)
  return items[items.length - 1]!.value;
}

/**
 * Pick from a value pool (handles both simple and weighted pools).
 */
export function pickFromPool<T>(pool: ValuePool<T>): T {
  if (isWeightedPool(pool)) {
    return pickWeighted(pool);
  }
  return pickRandom(pool);
}

/**
 * Pick N unique items from an array.
 */
export function pickMultiple<T>(items: readonly T[], count: number): T[] {
  if (count >= items.length) {
    return [...items];
  }

  const available = [...items];
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * available.length);
    result.push(available[index]!);
    available.splice(index, 1);
  }

  return result;
}

/**
 * Pick a random number of items (between min and max inclusive).
 */
export function pickRandomCount<T>(items: readonly T[], min: number, max: number): T[] {
  const count = randomInt(min, max);
  return pickMultiple(items, count);
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max.
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random float rounded to specified decimal places.
 */
export function randomFloatRounded(min: number, max: number, decimals = 2): number {
  const value = randomFloat(min, max);
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Generate a random boolean with optional probability of true.
 */
export function randomBool(probabilityTrue = 0.5): boolean {
  return Math.random() < probabilityTrue;
}

/**
 * Generate a random ID string.
 */
export function randomId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${timestamp}-${randomPart}` : `${timestamp}-${randomPart}`;
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}
