/**
 * Time System Module
 *
 * Exports all time-related types, schemas, utilities, and defaults.
 *
 * @example
 * ```typescript
 * import {
 *   GameTime,
 *   TimeConfig,
 *   advanceTime,
 *   formatGameTime,
 *   DEFAULT_TIME_CONFIG
 * } from '@minimal-rpg/schemas/time';
 * ```
 */

// Types
export type {
  GameTime,
  DayPeriod,
  SeasonConfig,
  HolidayConfig,
  CalendarConfig,
  TimeSkipConfig,
  TimeConfig,
  PendingTimeEvent,
  SessionTimeState,
  TimeSlice,
  TimeFormatOptions,
  TickResult,
  TimeSkipValidationResult,
  NarrativePOVMode,
  SessionNarrativeConfig,
} from './types.js';

// Schemas
export {
  GameTimeSchema,
  DayPeriodSchema,
  SeasonConfigSchema,
  HolidayConfigSchema,
  CalendarConfigSchema,
  TimeSkipConfigSchema,
  TimeConfigSchema,
  PendingTimeEventSchema,
  SessionTimeStateSchema,
  TimeSliceSchema,
  TimeFormatOptionsSchema,
  TickResultSchema,
  TimeSkipValidationResultSchema,
  NarrativePOVModeSchema,
  SessionNarrativeConfigSchema,
} from './schemas.js';

// Schema types (for when you need inferred types from schemas)
export type {
  GameTimeSchemaType,
  DayPeriodSchemaType,
  SeasonConfigSchemaType,
  HolidayConfigSchemaType,
  CalendarConfigSchemaType,
  TimeSkipConfigSchemaType,
  TimeConfigSchemaType,
  PendingTimeEventSchemaType,
  SessionTimeStateSchemaType,
  TimeSliceSchemaType,
  TimeFormatOptionsSchemaType,
  TickResultSchemaType,
  TimeSkipValidationResultSchemaType,
  NarrativePOVModeSchemaType,
  SessionNarrativeConfigSchemaType,
} from './schemas.js';

// Defaults
export {
  DEFAULT_DAY_PERIODS,
  DEFAULT_START_TIME,
  DEFAULT_TIME_SKIP_CONFIG,
  DEFAULT_TIME_CONFIG,
  FANTASY_CALENDAR_EXAMPLE,
} from './defaults.js';

// Utilities
export {
  // Time advancement
  advanceTime,
  advanceTimeBySeconds,
  gameTimeToTotalSeconds,
  totalSecondsToGameTime,
  tick,
  // Day periods
  getCurrentPeriod,
  getDayPeriods,
  // Formatting
  formatGameTime,
  getDayName,
  getMonthName,
  getCurrentSeason,
  // Time slice
  buildTimeSlice,
  // Time skip validation
  validateTimeSkip,
  // Comparison
  compareGameTime,
  gameTimeEquals,
  gameTimeDifferenceSeconds,
  // Holidays
  isHoliday,
  getHoliday,
  // Session state
  createInitialTimeState,
  updateTimeStateFromTick,
} from './utils.js';
