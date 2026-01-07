import { Effect } from 'effect';
import type { TokenBudget } from '../types.js';

export class TokenBudgetManager {
  private budgets: Map<string, TokenBudget> = new Map();

  constructor(private defaultLimit: number = 100000) {}

  getBudget(sessionId: string): TokenBudget {
    let budget = this.budgets.get(sessionId);
    if (!budget) {
      budget = {
        sessionId,
        limit: this.defaultLimit,
        used: 0,
        remaining: this.defaultLimit,
      };
      this.budgets.set(sessionId, budget);
    }
    return budget;
  }

  updateUsage(sessionId: string, tokens: number): Effect.Effect<TokenBudget, Error> {
    return Effect.sync(() => {
      const budget = this.getBudget(sessionId);
      budget.used += tokens;
      budget.remaining = Math.max(0, budget.limit - budget.used);
      return { ...budget };
    });
  }

  hasBudget(sessionId: string, estimatedTokens: number = 0): boolean {
    const budget = this.getBudget(sessionId);
    return budget.remaining >= estimatedTokens;
  }

  resetBudget(sessionId: string): void {
    this.budgets.delete(sessionId);
  }
}
