/**
 * Time System Defaults
 *
 * Default configurations for time systems.
 * Can be overridden per-setting in SettingProfile.timeConfig.
 */
import type { GameTime, DayPeriod, TimeConfig, TimeSkipConfig } from './types.js';

// =============================================================================
// Standard Earth-Like Defaults
// =============================================================================

/**
 * Standard day periods (Earth-like 24-hour day).
 */
export const DEFAULT_DAY_PERIODS: DayPeriod[] = [
  { name: 'night', startHour: 0, description: 'Deep night, most are asleep' },
  { name: 'pre-dawn', startHour: 4, description: 'The darkest hour before dawn' },
  { name: 'dawn', startHour: 6, description: 'The sky lightens as the sun rises' },
  { name: 'morning', startHour: 8, description: 'Morning light fills the world' },
  { name: 'late-morning', startHour: 10, description: 'The day is well underway' },
  { name: 'noon', startHour: 12, description: 'The sun is at its peak' },
  { name: 'afternoon', startHour: 14, description: 'The afternoon sun beats down' },
  { name: 'late-afternoon', startHour: 16, description: 'Shadows begin to lengthen' },
  { name: 'evening', startHour: 18, description: 'The sun sets and dusk approaches' },
  { name: 'dusk', startHour: 20, description: 'Twilight paints the sky' },
  { name: 'night', startHour: 22, description: 'Night falls upon the land' },
];

/**
 * Default starting time (Day 1, 8:00 AM).
 */
export const DEFAULT_START_TIME: GameTime = {
  year: 1,
  month: 1,
  dayOfMonth: 1,
  absoluteDay: 1,
  hour: 8,
  minute: 0,
  second: 0,
};

/**
 * Default time skip configuration.
 */
export const DEFAULT_TIME_SKIP_CONFIG: TimeSkipConfig = {
  maxSkipHours: 12,
  requireJustification: true,
  cooldownMinutes: 30,
  rejectionMessages: [
    "That's quite the nap you're planning.",
    'Time flies, but not that fast.',
    'Perhaps break that into smaller chunks?',
    'Even the most patient must wait.',
  ],
};

/**
 * Default time configuration (Earth-like calendar).
 */
export const DEFAULT_TIME_CONFIG: TimeConfig = {
  secondsPerTurn: 60, // 1 minute per turn
  hoursPerDay: 24,
  daysPerWeek: 7,
  daysPerMonth: 30,
  monthsPerYear: 12,
  dayPeriods: DEFAULT_DAY_PERIODS,
  calendar: {
    monthNames: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    seasons: [
      { name: 'Winter', startMonth: 12, startDay: 21, description: 'Cold and quiet' },
      { name: 'Spring', startMonth: 3, startDay: 21, description: 'New growth emerges' },
      { name: 'Summer', startMonth: 6, startDay: 21, description: 'Warm and long days' },
      { name: 'Autumn', startMonth: 9, startDay: 21, description: 'Harvest and falling leaves' },
    ],
  },
  defaultStartTime: DEFAULT_START_TIME,
  simulateOfflineTime: false,
  maxOfflineHours: 0,
  skipConfig: DEFAULT_TIME_SKIP_CONFIG,
};

// =============================================================================
// Fantasy Calendar Example
// =============================================================================

/**
 * Example fantasy calendar with different month/day names.
 * Use as a template for custom settings.
 */
export const FANTASY_CALENDAR_EXAMPLE: TimeConfig = {
  ...DEFAULT_TIME_CONFIG,
  monthsPerYear: 13, // 13 months in this fantasy world
  daysPerMonth: 28, // Moon-based months
  calendar: {
    monthNames: [
      'Frostveil',
      'Deepsnow',
      'Mudmarch',
      'Greenbloom',
      'Brightsky',
      'Sunpeak',
      'Goldenharvest',
      'Amberfall',
      'Mistweave',
      'Darkmoon',
      'Shadowtide',
      'Longsleep',
      'Starwait',
    ],
    dayNames: ['Moonday', 'Fireday', 'Waterday', 'Earthday', 'Windday', 'Lightday', 'Restday'],
    seasons: [
      { name: 'The Freeze', startMonth: 1, startDay: 1, description: 'Ice and silence' },
      { name: 'The Thaw', startMonth: 4, startDay: 1, description: 'Life returns' },
      { name: 'The Bloom', startMonth: 6, startDay: 15, description: 'Nature flourishes' },
      { name: 'The Harvest', startMonth: 9, startDay: 1, description: 'Reaping what was sown' },
      { name: 'The Wane', startMonth: 11, startDay: 15, description: 'Darkness grows' },
    ],
    holidays: [
      {
        name: 'Festival of Lights',
        month: 12,
        day: 15,
        description: 'Candles lit against the longest night',
        affectsSchedules: true,
      },
      {
        name: 'First Bloom',
        month: 4,
        day: 15,
        description: 'Celebration of spring',
        affectsSchedules: true,
      },
    ],
  },
  defaultStartTime: {
    year: 1247,
    month: 5,
    dayOfMonth: 1,
    absoluteDay: 1,
    hour: 9,
    minute: 0,
    second: 0,
  },
};
