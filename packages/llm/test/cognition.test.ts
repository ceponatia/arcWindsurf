import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import { TieredCognitionRouter } from '../src/cognition/tiered.js';
import { TokenBudgetManager } from '../src/cognition/budget.js';
import type { LLMProvider } from '../src/types.js';

describe('TieredCognitionRouter', () => {
  it('routes tasks to providers and executes', async () => {
    const fast: LLMProvider = {
      id: 'fast',
      supportsTools: false,
      supportsFunctions: false,
      chat: vi.fn(() => Effect.succeed({ id: 'fast', content: 'ok', tool_calls: null, usage: null })),
      stream: vi.fn(),
    };
    const deep: LLMProvider = { ...fast, id: 'deep' };
    const reasoning: LLMProvider = { ...fast, id: 'reasoning' };

    const router = new TieredCognitionRouter({ fast, deep, reasoning });

    const result = await Effect.runPromise(
      router.execute({ type: 'fast', messages: [{ role: 'user', content: 'Hi' }] })
    );

    expect(result.id).toBe('fast');
    expect(fast.chat).toHaveBeenCalled();
    expect(router.route({ type: 'vision', messages: [] }).id).toBe('deep');
  });
});

describe('TokenBudgetManager', () => {
  it('tracks usage and remaining budget', async () => {
    const manager = new TokenBudgetManager(10);

    const budget1 = manager.getBudget('session-1');
    expect(budget1.remaining).toBe(10);

    const updated = await Effect.runPromise(manager.updateUsage('session-1', 7));
    expect(updated.used).toBe(7);
    expect(updated.remaining).toBe(3);

    expect(manager.hasBudget('session-1', 4)).toBe(false);
    expect(manager.hasBudget('session-1', 3)).toBe(true);

    manager.resetBudget('session-1');
    const reset = manager.getBudget('session-1');
    expect(reset.used).toBe(0);
  });
});
