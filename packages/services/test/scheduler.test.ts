import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scheduler } from '../src/time/scheduler.js';
import type { NpcLocationState } from '@minimal-rpg/schemas';

const {
  emitMock,
  getActiveSessionsMock,
  getSessionNpcsWithSchedulesMock,
  getSessionGameTimeMock,
  getActorStateMock,
  updateActorStateMock,
  resolveNpcSchedulesBatchMock,
} = vi.hoisted(() => {
  const state: NpcLocationState = {
    locationId: 'loc-2',
    activity: {
      type: 'working',
      description: 'Working',
      engagement: 'focused',
    },
    arrivedAt: {
      year: 1,
      month: 1,
      dayOfMonth: 1,
      absoluteDay: 1,
      hour: 8,
      minute: 0,
      second: 0,
    },
    interruptible: true,
  };

  return {
    emitMock: vi.fn(),
    getActiveSessionsMock: vi.fn(async () => [{ id: 'session-1' }]),
    getSessionNpcsWithSchedulesMock: vi.fn(async () => [
      {
        npcId: 'npc-1',
        schedule: {
          id: 'schedule-1',
          name: 'Test Schedule',
          slots: [],
          defaultSlot: {
            destination: { type: 'fixed', locationId: 'loc-2' },
            activity: {
              type: 'working',
              description: 'Working',
              engagement: 'focused',
            },
          },
        },
      },
    ]),
    getSessionGameTimeMock: vi.fn(async () => ({
      year: 1,
      month: 1,
      dayOfMonth: 1,
      absoluteDay: 1,
      hour: 8,
      minute: 0,
      second: 0,
    })),
    getActorStateMock: vi.fn(async () => ({
      actorId: 'npc-1',
      state: {
        locationId: 'loc-1',
        activity: {
          type: 'idle',
        },
      },
    })),
    updateActorStateMock: vi.fn(async () => ({})),
    resolveNpcSchedulesBatchMock: vi.fn(() => ({
      locationStates: new Map([['npc-1', state]]),
      resolutions: new Map(),
      unresolved: [],
    })),
  };
});

vi.mock('@minimal-rpg/bus', () => ({
  worldBus: {
    emit: emitMock,
    subscribe: vi.fn(async () => undefined),
  },
}));

vi.mock('@minimal-rpg/db', () => ({
  getActiveSessions: getActiveSessionsMock,
  getSessionNpcsWithSchedules: getSessionNpcsWithSchedulesMock,
  getSessionGameTime: getSessionGameTimeMock,
  getActorState: getActorStateMock,
  updateActorState: updateActorStateMock,
}));

vi.mock('../src/time/schedule-service.js', () => ({
  resolveNpcSchedulesBatch: resolveNpcSchedulesBatchMock,
}));

describe('Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits move and activity events when schedule changes', async () => {
    await Scheduler.processSchedules('session-1', 1);

    expect(resolveNpcSchedulesBatchMock).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalled();
    expect(updateActorStateMock).toHaveBeenCalled();
  });

  it('processes all active sessions', async () => {
    await Scheduler.processAllSchedules(1);

    expect(getActiveSessionsMock).toHaveBeenCalled();
  });
});
