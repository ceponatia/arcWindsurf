import { describe, it, expect, vi } from 'vitest';
import { FactionService } from '../src/social/faction.js';

describe('FactionService', () => {
  it('returns neutral relationship and logs updates', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const relationship = FactionService.getRelationship('a', 'b');

    expect(relationship).toBe(0);

    FactionService.updateReputation('npc-1', 'faction', 10);
    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();
  });
});
