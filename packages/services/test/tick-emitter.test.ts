import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TickEmitter } from '../src/time/tick-emitter.js';

const emitMock = vi.fn();

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: { emit: emitMock },
}));

describe('TickEmitter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts and stops interval', async () => {
    const emitter = new TickEmitter();
    emitter.start(50);

    await vi.advanceTimersByTimeAsync(120);

    expect(emitMock).toHaveBeenCalled();
    emitter.stop();
  });
});
