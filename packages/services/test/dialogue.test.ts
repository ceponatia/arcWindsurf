import { describe, it, expect, vi } from 'vitest';
import { DialogueService } from '../src/social/dialogue.js';

describe('DialogueService (static)', () => {
  it('returns placeholder response', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const result = DialogueService.resolveResponse('npc-1', { topic: 'greeting' });

    expect(result.content).toBe("I'm listening...");
    expect(result.options).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
