import { describe, test, expect } from 'vitest';
import {
  buildOccupancyPromptContext,
  categorizeCrowdLevel,
  createNarrativeHints,
  filterExpectedArrivals,
  filterRecentDepartures,
  sortPresentNpcs,
} from '../src/state/index.js';
import type {
  GameTime,
  LocationOccupancy,
  PresentNpc,
  RecentDeparture,
  ExpectedArrival,
} from '../src/state/index.js';

const CURRENT_TIME: GameTime = {
  year: 1,
  month: 1,
  dayOfMonth: 1,
  absoluteDay: 1,
  hour: 10,
  minute: 0,
  second: 0,
};

describe('state/occupancy', () => {
  test('categorizeCrowdLevel handles capacity-aware and fallback thresholds', () => {
    const cases = [
      { present: 0, capacity: undefined, expected: 'empty' },
      { present: 2, capacity: undefined, expected: 'sparse' },
      { present: 6, capacity: undefined, expected: 'moderate' },
      { present: 16, capacity: undefined, expected: 'packed' },
      { present: 1, capacity: 20, expected: 'sparse' },
      { present: 3, capacity: 10, expected: 'moderate' },
      { present: 5, capacity: 10, expected: 'crowded' },
      { present: 8, capacity: 10, expected: 'packed' },
      { present: 12, capacity: 10, expected: 'packed' },
    ];

    for (const { present, capacity, expected } of cases) {
      expect(categorizeCrowdLevel(present, capacity)).toBe(expected);
    }
  });

  test('createNarrativeHints reacts to significant departures and arrivals', () => {
    const departures: RecentDeparture[] = [
      { npcId: 'notable', leftAt: CURRENT_TIME, destination: 'loc-a' },
      { npcId: 'transient', leftAt: CURRENT_TIME, destination: 'loc-b' },
    ];
    const arrivals: ExpectedArrival[] = [
      { npcId: 'major-arrival', expectedAt: CURRENT_TIME, fromLocation: 'loc-c' },
      { npcId: 'background-arrival', expectedAt: CURRENT_TIME, fromLocation: 'loc-d' },
    ];

    const getNpcTier = (npcId: string) =>
      ({
        notable: 'major',
        transient: 'transient',
        'major-arrival': 'major',
        'background-arrival': 'background',
      })[npcId] ?? 'minor';

    const result = createNarrativeHints(4, departures, arrivals, getNpcTier);
    expect(result).toEqual({
      shouldMentionCrowd: true,
      shouldMentionDeparture: true,
      shouldHintArrival: true,
    });
  });

  test('buildOccupancyPromptContext denormalizes NPCs and computes time deltas', () => {
    const occupancy: LocationOccupancy = {
      locationId: 'loc-1',
      present: [
        {
          npcId: 'major',
          activity: { type: 'chat', description: 'Chatting', engagement: 'idle' },
          arrivedAt: { ...CURRENT_TIME, hour: 9 },
          proximity: 'near',
        },
        {
          npcId: 'minor',
          activity: { type: 'work', description: 'Working', engagement: 'focused' },
          arrivedAt: { ...CURRENT_TIME, hour: 8 },
          proximity: 'far',
        },
      ],
      recentlyLeft: [
        { npcId: 'recent', leftAt: { ...CURRENT_TIME, hour: 9, minute: 45 }, destination: 'loc-2' },
        { npcId: 'old', leftAt: { ...CURRENT_TIME, hour: 7, minute: 0 }, destination: 'loc-3' },
      ],
      expectedArrivals: [
        {
          npcId: 'soon',
          expectedAt: { ...CURRENT_TIME, hour: 10, minute: 30 },
          fromLocation: 'loc-4',
        },
        {
          npcId: 'later',
          expectedAt: { ...CURRENT_TIME, hour: 12, minute: 0 },
          fromLocation: 'loc-5',
        },
      ],
      crowdLevel: 'moderate',
      computedAt: CURRENT_TIME,
    };

    const getNpcName = (npcId: string) =>
      ({
        major: 'Major NPC',
        minor: 'Minor NPC',
        recent: 'Recent NPC',
        old: 'Old NPC',
        soon: 'Soon NPC',
        later: 'Later NPC',
      })[npcId] ?? npcId;

    const getNpcTier = (npcId: string) =>
      ({
        major: 'major',
        minor: 'minor',
        recent: 'minor',
        old: 'transient',
        soon: 'major',
        later: 'background',
      })[npcId] ?? 'background';

    const getLocationName = (locationId: string) =>
      ({ 'loc-1': 'Inn', 'loc-2': 'Market', 'loc-3': 'Docks', 'loc-4': 'Gate', 'loc-5': 'Tower' })[
        locationId
      ] ?? locationId;

    const context = buildOccupancyPromptContext(
      occupancy,
      CURRENT_TIME,
      getNpcName,
      getNpcTier,
      getLocationName
    );

    expect(context.presentNpcs).toEqual([
      { name: 'Major NPC', activity: 'Chatting', engagement: 'idle', tier: 'major' },
      { name: 'Minor NPC', activity: 'Working', engagement: 'focused', tier: 'minor' },
    ]);
    expect(context.recentDepartures).toEqual([
      { name: 'Recent NPC', leftMinutesAgo: 15, destination: 'Market' },
      { name: 'Old NPC', leftMinutesAgo: 180, destination: 'Docks' },
    ]);
    expect(context.expectedArrivals).toEqual([
      { name: 'Soon NPC', arrivingInMinutes: 30, comingFrom: 'Gate' },
      { name: 'Later NPC', arrivingInMinutes: 120, comingFrom: 'Tower' },
    ]);
    expect(context.narrativeHints).toEqual({
      shouldMentionCrowd: false,
      shouldMentionDeparture: true,
      shouldHintArrival: true,
    });
  });

  test('filterRecentDepartures keeps only departures within the threshold', () => {
    const departures: RecentDeparture[] = [
      { npcId: 'recent', leftAt: { ...CURRENT_TIME, hour: 9, minute: 45 }, destination: 'loc-a' },
      { npcId: 'older', leftAt: { ...CURRENT_TIME, hour: 8, minute: 0 }, destination: 'loc-b' },
    ];

    const filtered = filterRecentDepartures(departures, CURRENT_TIME, 30);
    expect(filtered.map((d) => d.npcId)).toEqual(['recent']);
  });

  test('filterExpectedArrivals keeps only arrivals within the threshold', () => {
    const arrivals: ExpectedArrival[] = [
      {
        npcId: 'soon',
        expectedAt: { ...CURRENT_TIME, hour: 10, minute: 30 },
        fromLocation: 'loc-a',
      },
      {
        npcId: 'later',
        expectedAt: { ...CURRENT_TIME, hour: 12, minute: 0 },
        fromLocation: 'loc-b',
      },
    ];

    const filtered = filterExpectedArrivals(arrivals, CURRENT_TIME, 45);
    expect(filtered.map((a) => a.npcId)).toEqual(['soon']);
  });

  test('sortPresentNpcs orders by tier priority then engagement level', () => {
    const npcs: PresentNpc[] = [
      {
        npcId: 'background',
        activity: { type: 'watch', description: 'Watching', engagement: 'focused' },
        arrivedAt: CURRENT_TIME,
        proximity: 'near',
      },
      {
        npcId: 'major',
        activity: { type: 'plan', description: 'Planning', engagement: 'casual' },
        arrivedAt: CURRENT_TIME,
        proximity: 'near',
      },
      {
        npcId: 'minor',
        activity: { type: 'rest', description: 'Resting', engagement: 'idle' },
        arrivedAt: CURRENT_TIME,
        proximity: 'near',
      },
    ];

    const getNpcTier = (npcId: string) =>
      ({ major: 'major', minor: 'minor', background: 'background' })[npcId] ?? 'transient';
    const sorted = sortPresentNpcs(npcs, getNpcTier);

    expect(sorted.map((n) => n.npcId)).toEqual(['major', 'minor', 'background']);
  });
});
