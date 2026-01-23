import { describe, it } from 'vitest';
import { RulesEngine } from '../src/rules/rules-engine.js';

describe('RulesEngine', () => {
  it('start/stop are idempotent', () => {
    const engine = new RulesEngine();
    engine.start();
    engine.start();
    engine.stop();
    engine.stop();
  });
});
