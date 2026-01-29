import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from '../src/scheduler/index.js';


describe('Scheduler', () => {
  it('starts and stops world tick', async () => {
    const tickQueue = {
      getRepeatableJobs: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ name: 'tick-s1', key: 'k1', every: 500 }])
        .mockResolvedValueOnce([{ name: 'tick-s1', key: 'k1' }]),
      removeRepeatableByKey: vi.fn(async () => undefined),
      add: vi.fn(async () => undefined),
    };

    const scheduler = new Scheduler(tickQueue as never);
    await scheduler.startWorldTick('s1', 500);
    expect(tickQueue.add).toHaveBeenCalled();

    await scheduler.startWorldTick('s1', 500);
    expect(tickQueue.add).toHaveBeenCalledTimes(1);
    expect(tickQueue.removeRepeatableByKey).not.toHaveBeenCalled();

    await scheduler.stopWorldTick('s1');
    expect(tickQueue.removeRepeatableByKey).toHaveBeenCalledWith('k1');
  });
});
