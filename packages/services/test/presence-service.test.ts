import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresenceService } from '../src/presence/presence-service.js';
import type { PresenceScheduler } from '../src/presence/types.js';

vi.mock('@minimal-rpg/db', () => ({
  updateSessionHeartbeat: vi.fn(async () => ({ id: 'session-1', lastHeartbeatAt: new Date() })),
}));

describe('presence-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resumes ticks on the first heartbeat', async () => {
    const scheduler: PresenceScheduler = {
      startWorldTick: vi.fn(async () => undefined),
      stopWorldTick: vi.fn(async () => undefined),
    };
    const now = new Date('2026-01-29T00:00:00.000Z');
    const service = new PresenceService({ scheduler, now: () => now, pauseThresholdMs: 1000 });

    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('resumed');
    expect(scheduler.startWorldTick).toHaveBeenCalledWith('session-1');
  });

  it('keeps running within the threshold', async () => {
    const scheduler: PresenceScheduler = {
      startWorldTick: vi.fn(async () => undefined),
      stopWorldTick: vi.fn(async () => undefined),
    };
    const times = [
      new Date('2026-01-29T00:00:00.000Z'),
      new Date('2026-01-29T00:00:00.500Z'),
    ];
    let idx = 0;
    const service = new PresenceService({
      scheduler,
      now: () => times[Math.min(idx++, times.length - 1)] as Date,
      pauseThresholdMs: 1000,
    });

    await service.recordHeartbeat('session-1');
    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('running');
    expect(scheduler.startWorldTick).toHaveBeenCalledTimes(1);
  });

  it('resumes after inactivity beyond threshold', async () => {
    const scheduler: PresenceScheduler = {
      startWorldTick: vi.fn(async () => undefined),
      stopWorldTick: vi.fn(async () => undefined),
    };
    const times = [
      new Date('2026-01-29T00:00:00.000Z'),
      new Date('2026-01-29T00:00:10.000Z'),
    ];
    let idx = 0;
    const service = new PresenceService({
      scheduler,
      now: () => times[Math.min(idx++, times.length - 1)] as Date,
      pauseThresholdMs: 1000,
    });

    await service.recordHeartbeat('session-1');
    const result = await service.recordHeartbeat('session-1');

    expect(result.status).toBe('resumed');
    expect(scheduler.startWorldTick).toHaveBeenCalledTimes(2);
  });
});
