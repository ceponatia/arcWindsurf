import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeService } from '../src/time/time-service.js';

const emitMock = vi.fn();

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: { emit: emitMock },
}));

describe('TimeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits ticks and increments counter', async () => {
    const service = new TimeService();
    service.start(100);

    await vi.advanceTimersByTimeAsync(300);

    expect(emitMock).toHaveBeenCalled();
    expect(service.getCurrentTick()).toBeGreaterThan(0);

    service.stop();
  });

  it('manually emits tick', async () => {
    const service = new TimeService();
    await service.emitTick();
    expect(emitMock).toHaveBeenCalled();
  });
});
