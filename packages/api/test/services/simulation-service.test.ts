import { describe, expect, it, vi } from 'vitest';
import type { GameTime, NpcLocationState, NpcScheduleData } from '@minimal-rpg/schemas';
import {
  runSimulationTick,
  runTimeSkipSimulation,
  getNpcsNeedingSimulation,
  buildSimulationPriorities,
} from '../../src/services/simulation-service.js';

const scheduleMocks = vi.hoisted(() => ({
  resolveNpcScheduleAtTimeMock: vi.fn(),
}));

vi.mock('../../src/services/schedule-service.js', () => ({
  resolveNpcScheduleAtTime: scheduleMocks.resolveNpcScheduleAtTimeMock,
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

const scheduleDataBase = {
  schedule: scheduleTemplate,
};

describe('services/simulation-service', () => {
  it('simulates npc ticks and respects max limits', () => {
    scheduleMocks.resolveNpcScheduleAtTimeMock.mockReturnValue({ locationState });

    const result = runSimulationTick(
      [
        { npcId: 'npc-1', tier: 'major', scheduleData: { ...scheduleDataBase, npcId: 'npc-1' } },
        { npcId: 'npc-2', tier: 'minor', scheduleData: { ...scheduleDataBase, npcId: 'npc-2' } },
      ],
      {
        currentTime: time,
        trigger: 'turn',
        playerLocationId: 'loc-1',
        currentTurn: 10,
        maxNpcs: 1,
      }
    );

    expect(result.results).toHaveLength(1);
    expect(result.skipped).toContain('npc-2');
  });

  it('simulates a time skip and reports state changes', () => {
    scheduleMocks.resolveNpcScheduleAtTimeMock.mockReturnValue({ locationState });

    const result = runTimeSkipSimulation(
      [{ npcId: 'npc-1', tier: 'major', scheduleData: { ...scheduleDataBase, npcId: 'npc-1' } }],
      time,
      { ...time, hour: 10 },
      {
        playerLocationId: 'loc-1',
      }
    );

    expect(result.stateChanges).toHaveLength(1);
  });

  it('filters npcs based on trigger and cache', () => {
    const cache = new Map([
      [
        'npc-1',
        {
          computedAt: time,
          expiresAt: { ...time, hour: 10 },
        },
      ],
    ]);

    const needed = getNpcsNeedingSimulation(
      [{ npcId: 'npc-1', tier: 'minor', scheduleData: { ...scheduleDataBase, npcId: 'npc-1' } }],
      'turn',
      time,
      cache
    );

    expect(needed).toEqual([]);
  });

  it('builds simulation priorities with recency decay', () => {
    const priorities = buildSimulationPriorities(
      [
        {
          npcId: 'npc-1',
          tier: 'minor',
          scheduleData: { ...scheduleDataBase, npcId: 'npc-1' },
          lastInteractionTurn: 1,
        },
      ],
      'loc-1',
      10
    );

    expect(priorities[0]?.lastInteractionTurn).toBe(1);
    expect(priorities[0]?.currentPriority).toBeGreaterThan(0);
  });
});
