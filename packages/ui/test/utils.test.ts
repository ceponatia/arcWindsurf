import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils.js';

describe('cn', () => {
  it('merges class names and tailwind conflicts', () => {
    const result = cn('px-2', 'px-4', { hidden: false, block: true }, ['text-sm']);
    expect(result).toContain('px-4');
    expect(result).toContain('block');
    expect(result).toContain('text-sm');
    expect(result).not.toContain('px-2');
  });
});
