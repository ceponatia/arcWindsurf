import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameTime, NpcLocationState, NpcScheduleData } from '@minimal-rpg/schemas';
import {
  onTurnComplete,
  onPeriodChange,
  onLocationChange,
  onTimeSkip,
} from '../../src/services/simulation-hooks.js';

const hookMocks = vi.hoisted(() => ({
  listActorStatesForSessionMock: vi.fn(),
  bulkUpsertActorStatesMock: vi.fn(),
  runSimulationTickMock: vi.fn(),
  runTimeSkipSimulationMock: vi.fn(),
}));

vi.mock('@minimal-rpg/db/node', () => ({
  listActorStatesForSession: hookMocks.listActorStatesForSessionMock,
  bulkUpsertActorStates: hookMocks.bulkUpsertActorStatesMock,
}));

vi.mock('../../src/services/simulation-service.js', () => ({
  runSimulationTick: hookMocks.runSimulationTickMock,
  runTimeSkipSimulation: hookMocks.runTimeSkipSimulationMock,
}));

const time: GameTime = {
  year: 1,
  month: 1,
  dayOfMonth: 1,
  absoluteDay: 1,
  hour: 9,
  minute: 0,
  second: 0,
};

const locationState: NpcLocationState = {
  locationId: 'loc-1',
  activity: { type: 'idle', description: 'Waiting', engagement: 'casual' },
  arrivedAt: time,
  interruptible: true,
};

const morningPeriod = {
  name: 'morning',
  startHour: 8,
  description: 'Morning light fills the world',
};

const afternoonPeriod = {
  name: 'afternoon',
  startHour: 14,
  description: 'The afternoon sun beats down',
};

const scheduleTemplate: NpcScheduleData['schedule'] = {
  id: 'schedule-1',
  name: 'Daily',
  slots: [
    {
      id: 'slot-1',
      startTime: { hour: 8, minute: 0 },
      endTime: { hour: 9, minute: 0 },
      destination: { type: 'fixed', locationId: 'loc-1' },
      activity: { type: 'idle', description: 'Waiting', engagement: 'casual' },
    },
  ],
  defaultSlot: {
    destination: { type: 'fixed', locationId: 'loc-1' },
    activity: { type: 'idle', description: 'Waiting', engagement: 'casual' },
  },
};

const makeScheduleData = (npcId: string): NpcScheduleData => ({
  npcId,
  schedule: scheduleTemplate,
});

const actorStates = [
  {
    sessionId: 'session-1',
    actorId: 'npc-1',
    actorType: 'npc',
    entityProfileId: 'npc-1',
    lastEventSeq: 1,
    state: { locationState },
  },
  {
    sessionId: 'session-1',
    actorId: 'npc-2',
    actorType: 'npc',
    entityProfileId: 'npc-2',
    lastEventSeq: 2,
    state: { locationState },
  },
];

describe('services/simulation-hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookMocks.listActorStatesForSessionMock.mockResolvedValue(actorStates);
  });

  it('handles turn completion and detects location changes', async () => {
    hookMocks.runSimulationTickMock.mockReturnValue({
      results: [
        {
          npcId: 'npc-1',
          newState: locationState,
          previousState: locationState,
          stateChanged: false,
        },
        {
          npcId: 'npc-2',
          newState: { ...locationState, locationId: 'loc-2' },
          previousState: locationState,
          stateChanged: true,
        },
      ],
      skipped: [],
    });

    const result = await onTurnComplete({
      sessionId: 'session-1',
      ownerEmail: 'owner@example.com',
      currentTime: time,
      playerLocationId: 'loc-1',
      currentTurn: 1,
      npcs: [
        { npcId: 'npc-1', tier: 'minor', scheduleData: makeScheduleData('npc-1') },
        { npcId: 'npc-2', tier: 'minor', scheduleData: makeScheduleData('npc-2') },
      ],
    });

    expect(result.npcLeftLocation).toBe(true);
    expect(result.npcEnteredLocation).toBe(false);
    expect(hookMocks.bulkUpsertActorStatesMock).toHaveBeenCalledTimes(1);
  });

  it('flags occupancy changes on period transitions', async () => {
    hookMocks.runSimulationTickMock.mockReturnValue({
      results: [
        {
          npcId: 'npc-1',
          newState: { ...locationState, locationId: 'loc-2' },
          previousState: locationState,
          stateChanged: true,
        },
      ],
      skipped: [],
    });

    const result = await onPeriodChange({
      sessionId: 'session-1',
      ownerEmail: 'owner@example.com',
      currentTime: time,
      playerLocationId: 'loc-1',
      previousPeriod: morningPeriod,
      newPeriod: afternoonPeriod,
      npcs: [{ npcId: 'npc-1', tier: 'minor', scheduleData: makeScheduleData('npc-1') }],
    });

    expect(result.locationOccupancyChanged).toBe(true);
  });

  it('builds occupancy on location change', async () => {
    hookMocks.runSimulationTickMock.mockReturnValue({
      results: [
        {
          npcId: 'npc-1',
          newState: locationState,
          previousState: locationState,
          stateChanged: true,
        },
      ],
      skipped: [],
    });

    const result = await onLocationChange({
      sessionId: 'session-1',
      ownerEmail: 'owner@example.com',
      currentTime: time,
      previousLocationId: 'loc-0',
      newLocationId: 'loc-1',
      npcs: [{ npcId: 'npc-1', tier: 'minor', scheduleData: makeScheduleData('npc-1') }],
    });

    expect(result.npcsPresent).toEqual(['npc-1']);
    expect(result.occupancy.present).toHaveLength(1);
    expect(hookMocks.bulkUpsertActorStatesMock).toHaveBeenCalledTimes(1);
  });

  it('summarizes time skips', async () => {
    hookMocks.runTimeSkipSimulationMock.mockReturnValue({
      stateChanges: [
        {
          npcId: 'npc-1',
          previousState: locationState,
          newState: { ...locationState, locationId: 'loc-2' },
        },
      ],
      skipped: [],
      summary: 'Time passes.',
    });

    const result = await onTimeSkip({
      sessionId: 'session-1',
      ownerEmail: 'owner@example.com',
      fromTime: time,
      toTime: { ...time, hour: 10 },
      playerLocationId: 'loc-1',
      npcs: [{ npcId: 'npc-1', tier: 'minor', scheduleData: makeScheduleData('npc-1') }],
    });

    expect(result.summary).toContain('someone moved');
    expect(hookMocks.bulkUpsertActorStatesMock).toHaveBeenCalledTimes(1);
  });
});
