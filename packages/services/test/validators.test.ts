import { describe, it, expect, vi } from 'vitest';
import { Validators } from '../src/rules/validators.js';
import type { WorldEvent } from '@minimal-rpg/schemas';

describe('Validators', () => {
  it('returns valid result and logs', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    const result = Validators.validateAction({ type: 'MOVE_INTENT' } as WorldEvent, {
      currentLocationId: 'loc-1',
    });

    expect(result.valid).toBe(true);
    expect(result.reason).toBe('');
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
