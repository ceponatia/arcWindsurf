import { describe, it, expect, vi } from 'vitest';
import { HeartbeatMonitor } from '../src/heartbeat-monitor.js';

function createPresence(sessionId: string, lastHeartbeatAt: Date) {
  return {
    listSessions: () => [{ sessionId, lastHeartbeatAt }],
    removeSession: vi.fn(),
  };
}

describe('HeartbeatMonitor', () => {
  it('pauses stale sessions and removes them from tracking', async () => {
    const presence = createPresence('session-1', new Date('2026-01-29T00:00:00.000Z'));
    const scheduler = { stopWorldTick: vi.fn(async () => undefined) };

    const monitor = new HeartbeatMonitor({
      presence,
      scheduler,
      pauseThresholdMs: 1000,
      now: () => new Date('2026-01-29T00:00:10.000Z'),
    });

    await monitor.checkOnce();

    expect(scheduler.stopWorldTick).toHaveBeenCalledWith('session-1');
    expect(presence.removeSession).toHaveBeenCalledWith('session-1');
  });

  it('leaves recent sessions running', async () => {
    const presence = createPresence('session-2', new Date('2026-01-29T00:00:09.500Z'));
    const scheduler = { stopWorldTick: vi.fn(async () => undefined) };

    const monitor = new HeartbeatMonitor({
      presence,
      scheduler,
      pauseThresholdMs: 1000,
      now: () => new Date('2026-01-29T00:00:10.000Z'),
    });

    await monitor.checkOnce();

    expect(scheduler.stopWorldTick).not.toHaveBeenCalled();
    expect(presence.removeSession).not.toHaveBeenCalled();
  });
});
