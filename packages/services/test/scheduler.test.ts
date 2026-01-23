import { describe, it, expect, vi } from 'vitest';
import { Scheduler } from '../src/time/scheduler.js';

describe('Scheduler', () => {
  it('logs schedule processing', async () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    await Scheduler.processSchedules(5);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
