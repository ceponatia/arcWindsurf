import {
  advanceTime,
  advanceTimeBySeconds,
  gameTimeToTotalSeconds,
  totalSecondsToGameTime,
  getCurrentPeriod,
  formatGameTime,
  validateTimeSkip,
  compareGameTime,
  gameTimeEquals,
  gameTimeDifferenceSeconds,
  DEFAULT_TIME_CONFIG,
  getDayPeriods,
} from '../src/time/index.js';
import type { DayPeriod, GameTime, TimeConfig } from '../src/time/index.js';

const BASE_TIME: GameTime = {
  year: 1,
  month: 1,
  dayOfMonth: 1,
  absoluteDay: 1,
  hour: 8,
  minute: 0,
  second: 0,
};

describe('time/utils', () => {
  test('advanceTime and advanceTimeBySeconds move time forward and wrap days', () => {
    const cases = [
      {
        name: 'single turn uses secondsPerTurn',
        current: BASE_TIME,
        turns: 2,
        expected: { hour: 8, minute: 2, dayOfMonth: 1, absoluteDay: 1 },
      },
      {
        name: 'seconds advancement crosses into next day',
        current: { ...BASE_TIME, hour: 23, minute: 59, second: 30 },
        seconds: 120,
        expected: { hour: 0, minute: 1, dayOfMonth: 2, absoluteDay: 2 },
      },
    ];

    for (const scenario of cases) {
      const result = scenario.seconds
        ? advanceTimeBySeconds(scenario.current, DEFAULT_TIME_CONFIG, scenario.seconds)
        : advanceTime(scenario.current, DEFAULT_TIME_CONFIG, scenario.turns ?? 1);

      expect(result.hour).toBe(scenario.expected.hour);
      expect(result.minute).toBe(scenario.expected.minute);
      expect(result.dayOfMonth).toBe(scenario.expected.dayOfMonth);
      expect(result.absoluteDay).toBe(scenario.expected.absoluteDay);
    }
  });

  test('gameTimeToTotalSeconds and totalSecondsToGameTime are inverses', () => {
    const cases = [
      BASE_TIME,
      { ...BASE_TIME, hour: 13, minute: 45, second: 30 },
      { ...BASE_TIME, absoluteDay: 32, dayOfMonth: 2, month: 2, hour: 6, minute: 10, second: 5 },
    ];

    for (const original of cases) {
      const total = gameTimeToTotalSeconds(original, DEFAULT_TIME_CONFIG);
      const roundTripped = totalSecondsToGameTime(total, DEFAULT_TIME_CONFIG);
      expect(roundTripped).toEqual(original);
    }
  });

  test('getCurrentPeriod sorts custom periods by startHour descending', () => {
    const customPeriods: DayPeriod[] = [
      { name: 'late', startHour: 20 },
      { name: 'early', startHour: 5 },
      { name: 'mid', startHour: 12 },
    ];
    const config: TimeConfig = { ...DEFAULT_TIME_CONFIG, dayPeriods: customPeriods };

    const cases = [
      { hour: 6, expected: 'early' },
      { hour: 13, expected: 'mid' },
      { hour: 21, expected: 'late' },
    ];

    for (const { hour, expected } of cases) {
      const period = getCurrentPeriod({ ...BASE_TIME, hour }, config);
      expect(period.name).toBe(expected);
    }
  });

  test('getDayPeriods falls back to defaults when config is empty', () => {
    const config: TimeConfig = { ...DEFAULT_TIME_CONFIG, dayPeriods: [] };
    const periods = getDayPeriods(config);
    expect(periods).toEqual(DEFAULT_TIME_CONFIG.dayPeriods);
  });

  test('formatGameTime renders day, time, and period based on options', () => {
    const cases = [
      {
        time: { ...BASE_TIME, hour: 14, minute: 5 },
        options: {},
        expected: 'Sunday, Day 1 14:05 (afternoon)',
      },
      {
        time: { ...BASE_TIME, hour: 0, minute: 0, second: 9 },
        options: { use24Hour: false, showSeconds: true, showDay: false, showPeriod: false },
        expected: '12:00:09 AM',
      },
    ];

    for (const { time, options, expected } of cases) {
      expect(formatGameTime(time, DEFAULT_TIME_CONFIG, options)).toBe(expected);
    }
  });

  test('validateTimeSkip respects maxSkipHours and uses provided rejection messages', () => {
    const config: TimeConfig = {
      ...DEFAULT_TIME_CONFIG,
      skipConfig: {
        maxSkipHours: 2,
        requireJustification: true,
        cooldownMinutes: 0,
        rejectionMessages: ['first', 'second', 'third'],
      },
    };

    const allowed = validateTimeSkip(3600, config);
    expect(allowed).toEqual({ allowed: true, requestedHours: 1, maxAllowedHours: 2 });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const rejected = validateTimeSkip(4 * 3600, config);
    expect(rejected.allowed).toBe(false);
    expect(rejected.rejectionMessage).toBe('second');
    randomSpy.mockRestore();
  });

  test('compareGameTime family compares times consistently', () => {
    const earlier: GameTime = { ...BASE_TIME, hour: 7, minute: 59 };
    const later: GameTime = { ...BASE_TIME, hour: 8, minute: 1 };

    expect(compareGameTime(earlier, later)).toBe(-1);
    expect(compareGameTime(later, earlier)).toBe(1);
    expect(compareGameTime(later, later)).toBe(0);
    expect(gameTimeEquals(later, later)).toBe(true);
    expect(gameTimeEquals(later, earlier)).toBe(false);
    expect(gameTimeDifferenceSeconds(later, earlier, DEFAULT_TIME_CONFIG)).toBe(2 * 60);
  });
});
