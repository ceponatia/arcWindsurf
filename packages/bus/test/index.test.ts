import { describe, it, expect } from 'vitest';
import { worldBus, redisPubSub } from '../src/index.js';

describe('bus index exports', () => {
  it('exports worldBus and redis adapter', () => {
    expect(worldBus).toBeTruthy();
    expect(redisPubSub).toBeTruthy();
  });
});
