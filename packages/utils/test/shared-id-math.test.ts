import { describe, it, expect } from 'vitest';
import { generateId } from '../src/shared/id.js';
import { clamp } from '../src/shared/math.js';

describe('shared id and math', () => {
  it('generates uuid-like id', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(20);
  });

  it('clamps values', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
