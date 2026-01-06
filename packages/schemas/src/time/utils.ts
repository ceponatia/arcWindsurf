/**
 * Time System Utilities
 *
 * Pure functions for time calculations and formatting.
 * No side effects, no IO - these can be used anywhere.
 */
import type {
  GameTime,
  TimeConfig,
  DayPeriod,
  TickResult,
  TimeSlice,
  TimeFormatOptions,
  TimeSkipValidationResult,
  PendingTimeEvent,
  SessionTimeState,
} from './types.js';
import { DEFAULT_TIME_CONFIG, DEFAULT_DAY_PERIODS } from './defaults.js';

// =============================================================================
// Time Advancement
// =============================================================================

/**
 * Advance game time by a number of turns (default: 1).
 *
 * @param current - Current game time
 * @param config - Time configuration
 * @param turns - Number of turns to advance (default: 1)
 * @returns New game time after advancement
 */
export function advanceTime(
  current: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG,
  turns = 1
): GameTime {
  const totalSeconds = turns * config.secondsPerTurn;
  return advanceTimeBySeconds(current, config, totalSeconds);
}

/**
 * Advance game time by a specific number of seconds.
 *
 * @param current - Current game time
 * @param config - Time configuration
 * @param seconds - Number of seconds to advance
 * @returns New game time after advancement
 */
export function advanceTimeBySeconds(
  current: GameTime,
  config: TimeConfig,
  seconds: number
): GameTime {
  // Calculate total seconds from midnight of day 1
  const currentTotalSeconds = gameTimeToTotalSeconds(current, config);
  const newTotalSeconds = currentTotalSeconds + seconds;

  // Convert back to GameTime
  return totalSecondsToGameTime(newTotalSeconds, config);
}

/**
 * Convert GameTime to total seconds since epoch (year 1, month 1, day 1, 00:00:00).
 */
export function gameTimeToTotalSeconds(time: GameTime, config: TimeConfig): number {
  const secondsPerMinute = 60;
  const secondsPerHour = secondsPerMinute * 60;
  const secondsPerDay = secondsPerHour * config.hoursPerDay;

  // Use absoluteDay for simplicity (already accounts for year/month)
  const daySeconds = (time.absoluteDay - 1) * secondsPerDay;
  const hourSeconds = time.hour * secondsPerHour;
  const minuteSeconds = time.minute * secondsPerMinute;

  return daySeconds + hourSeconds + minuteSeconds + time.second;
}

/**
 * Convert total seconds since epoch back to GameTime.
 */
export function totalSecondsToGameTime(totalSeconds: number, config: TimeConfig): GameTime {
  const secondsPerMinute = 60;
  const secondsPerHour = secondsPerMinute * 60;
  const secondsPerDay = secondsPerHour * config.hoursPerDay;
  const daysPerYear = config.daysPerMonth * config.monthsPerYear;

  let remaining = totalSeconds;

  // Calculate absolute day (1-indexed)
  const absoluteDay = Math.floor(remaining / secondsPerDay) + 1;
  remaining %= secondsPerDay;

  // Calculate hour, minute, second
  const hour = Math.floor(remaining / secondsPerHour);
  remaining %= secondsPerHour;

  const minute = Math.floor(remaining / secondsPerMinute);
  const second = remaining % secondsPerMinute;

  // Calculate year, month, dayOfMonth from absoluteDay
  const dayIndex = absoluteDay - 1; // 0-indexed for calculation
  const year = Math.floor(dayIndex / daysPerYear) + 1;
  const dayInYear = dayIndex % daysPerYear;
  const month = Math.floor(dayInYear / config.daysPerMonth) + 1;
  const dayOfMonth = (dayInYear % config.daysPerMonth) + 1;

  return {
    year,
    month,
    dayOfMonth,
    absoluteDay,
    hour,
    minute,
    second,
  };
}

/**
 * Perform a time tick and return detailed results.
 *
 * @param current - Current game time
 * @param config - Time configuration
 * @param turns - Number of turns (default: 1)
 * @param pendingEvents - Optional pending events to check
 * @returns TickResult with previous/new time and changes
 */
export function tick(
  current: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG,
  turns = 1,
  pendingEvents?: PendingTimeEvent[]
): TickResult {
  const newTime = advanceTime(current, config, turns);
  const previousPeriod = getCurrentPeriod(current, config);
  const newPeriod = getCurrentPeriod(newTime, config);
  const periodChanged = previousPeriod.name !== newPeriod.name;
  const dayChanged = current.absoluteDay !== newTime.absoluteDay;

  // Check for triggered events
  const triggeredEvents = pendingEvents?.filter(
    (event) =>
      compareGameTime(event.triggerTime, current) >= 0 &&
      compareGameTime(event.triggerTime, newTime) < 0
  );

  return {
    previousTime: current,
    newTime,
    periodChanged,
    newPeriod: periodChanged ? newPeriod : undefined,
    dayChanged,
    triggeredEvents: triggeredEvents?.length ? triggeredEvents : undefined,
  };
}

// =============================================================================
// Day Period Helpers
// =============================================================================

/**
 * Get the current day period based on the hour.
 *
 * @param time - Current game time
 * @param config - Time configuration
 * @returns Current day period
 */
export function getCurrentPeriod(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): DayPeriod {
  const periods = config.dayPeriods.length > 0 ? config.dayPeriods : DEFAULT_DAY_PERIODS;

  // Sort periods by startHour descending to find the latest one that starts before current hour
  const sortedPeriods = [...periods].sort((a, b) => b.startHour - a.startHour);

  for (const period of sortedPeriods) {
    if (time.hour >= period.startHour) {
      return period;
    }
  }

  // If no period found (shouldn't happen with proper config), return the first one
  // Use non-null assertion since DEFAULT_DAY_PERIODS always has entries
  const fallback = sortedPeriods[sortedPeriods.length - 1];
  if (!fallback) {
    // This should never happen with DEFAULT_DAY_PERIODS, but satisfy TypeScript
    return { name: 'unknown', startHour: 0 };
  }
  return fallback;
}

/**
 * Get all day periods for a configuration.
 */
export function getDayPeriods(config: TimeConfig = DEFAULT_TIME_CONFIG): DayPeriod[] {
  return config.dayPeriods.length > 0 ? config.dayPeriods : DEFAULT_DAY_PERIODS;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format game time as a human-readable string.
 *
 * @param time - Game time to format
 * @param config - Time configuration (for calendar names)
 * @param options - Formatting options
 * @returns Formatted time string
 */
export function formatGameTime(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG,
  options: Partial<TimeFormatOptions> = {}
): string {
  const opts: TimeFormatOptions = {
    showDay: true,
    use24Hour: true,
    showSeconds: false,
    showPeriod: true,
    ...options,
  };

  const parts: string[] = [];

  // Day part
  if (opts.showDay) {
    const dayName = getDayName(time, config);
    if (dayName) {
      parts.push(`${dayName}, Day ${time.absoluteDay}`);
    } else {
      parts.push(`Day ${time.absoluteDay}`);
    }
  }

  // Time part
  let hourStr: string;
  let suffix = '';

  if (opts.use24Hour) {
    hourStr = time.hour.toString().padStart(2, '0');
  } else {
    const hour12 = time.hour % 12 || 12;
    hourStr = hour12.toString();
    suffix = time.hour < 12 ? ' AM' : ' PM';
  }

  const minuteStr = time.minute.toString().padStart(2, '0');
  let timeStr = `${hourStr}:${minuteStr}`;

  if (opts.showSeconds) {
    timeStr += `:${time.second.toString().padStart(2, '0')}`;
  }

  timeStr += suffix;
  parts.push(timeStr);

  // Period part
  if (opts.showPeriod) {
    const period = getCurrentPeriod(time, config);
    parts.push(`(${period.name})`);
  }

  return parts.join(' ');
}

/**
 * Get the day name from the calendar (if configured).
 */
export function getDayName(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): string | undefined {
  const calendar = config.calendar;
  if (!calendar?.dayNames.length) return undefined;

  const dayIndex = (time.absoluteDay - 1) % config.daysPerWeek;
  return calendar.dayNames[dayIndex];
}

/**
 * Get the month name from the calendar (if configured).
 */
export function getMonthName(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): string | undefined {
  const calendar = config.calendar;
  if (!calendar?.monthNames.length) return undefined;

  return calendar.monthNames[time.month - 1];
}

/**
 * Get the current season (if configured).
 */
export function getCurrentSeason(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): string | undefined {
  const seasons = config.calendar?.seasons;
  if (!seasons?.length) return undefined;

  // Find the latest season that has started
  const sortedSeasons = [...seasons].sort((a, b) => {
    if (a.startMonth !== b.startMonth) return b.startMonth - a.startMonth;
    return b.startDay - a.startDay;
  });

  for (const season of sortedSeasons) {
    if (
      time.month > season.startMonth ||
      (time.month === season.startMonth && time.dayOfMonth >= season.startDay)
    ) {
      return season.name;
    }
  }

  // If before first season of the year, return the last season (wraps around)
  return sortedSeasons[0]?.name;
}

// =============================================================================
// Time Slice Builder
// =============================================================================

/**
 * Build a TimeSlice for use in turn context.
 *
 * @param state - Session time state
 * @param config - Time configuration
 * @returns TimeSlice with all formatted data
 */
export function buildTimeSlice(
  state: SessionTimeState,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): TimeSlice {
  const period = getCurrentPeriod(state.current, config);

  return {
    current: state.current,
    formatted: formatGameTime(state.current, config),
    period: period.name,
    periodDescription: period.description ?? '',
    totalTurns: state.totalTurns,
    dayName: getDayName(state.current, config),
    monthName: getMonthName(state.current, config),
    season: getCurrentSeason(state.current, config),
  };
}

// =============================================================================
// Time Skip Validation
// =============================================================================

/**
 * Validate a time skip request.
 *
 * @param requestedSeconds - Requested skip in seconds
 * @param config - Time configuration
 * @returns Validation result with allowed status and rejection message
 */
export function validateTimeSkip(
  requestedSeconds: number,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): TimeSkipValidationResult {
  const requestedHours = requestedSeconds / 3600;
  const maxAllowedHours = config.skipConfig?.maxSkipHours ?? 12;

  if (requestedHours <= maxAllowedHours) {
    return {
      allowed: true,
      requestedHours,
      maxAllowedHours,
    };
  }

  // Pick a random rejection message
  const messages = config.skipConfig?.rejectionMessages ?? ["That's a bit too long to skip."];
  const rejectionMessage = messages[Math.floor(Math.random() * messages.length)];

  return {
    allowed: false,
    requestedHours,
    maxAllowedHours,
    rejectionMessage,
  };
}

// =============================================================================
// Time Comparison
// =============================================================================

/**
 * Compare two GameTime values.
 *
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareGameTime(a: GameTime, b: GameTime): number {
  if (a.absoluteDay !== b.absoluteDay) {
    return a.absoluteDay < b.absoluteDay ? -1 : 1;
  }
  if (a.hour !== b.hour) {
    return a.hour < b.hour ? -1 : 1;
  }
  if (a.minute !== b.minute) {
    return a.minute < b.minute ? -1 : 1;
  }
  if (a.second !== b.second) {
    return a.second < b.second ? -1 : 1;
  }
  return 0;
}

/**
 * Check if two GameTime values are equal.
 */
export function gameTimeEquals(a: GameTime, b: GameTime): boolean {
  return compareGameTime(a, b) === 0;
}

/**
 * Calculate the difference between two times in seconds.
 */
export function gameTimeDifferenceSeconds(
  later: GameTime,
  earlier: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): number {
  const laterSeconds = gameTimeToTotalSeconds(later, config);
  const earlierSeconds = gameTimeToTotalSeconds(earlier, config);
  return laterSeconds - earlierSeconds;
}

// =============================================================================
// Holiday Helpers
// =============================================================================

/**
 * Check if today is a holiday.
 */
export function isHoliday(time: GameTime, config: TimeConfig = DEFAULT_TIME_CONFIG): boolean {
  return getHoliday(time, config) !== undefined;
}

/**
 * Get the holiday for the current day (if any).
 */
export function getHoliday(
  time: GameTime,
  config: TimeConfig = DEFAULT_TIME_CONFIG
): { name: string; description?: string; affectsSchedules: boolean } | undefined {
  const holidays = config.calendar?.holidays;
  if (!holidays?.length) return undefined;

  const holiday = holidays.find((h) => h.month === time.month && h.day === time.dayOfMonth);

  return holiday;
}

// =============================================================================
// Session State Helpers
// =============================================================================

/**
 * Create initial session time state.
 */
export function createInitialTimeState(config: TimeConfig = DEFAULT_TIME_CONFIG): SessionTimeState {
  const period = getCurrentPeriod(config.defaultStartTime, config);

  return {
    current: { ...config.defaultStartTime },
    totalTurns: 0,
    lastActiveAt: new Date().toISOString(),
    currentPeriod: period.name,
    pendingTimeEvents: [],
  };
}

/**
 * Update session time state after a tick.
 */
export function updateTimeStateFromTick(
  state: SessionTimeState,
  tickResult: TickResult,
  turnsAdvanced: number
): SessionTimeState {
  // Remove triggered events from pending
  const remainingEvents = state.pendingTimeEvents?.filter(
    (e) => !tickResult.triggeredEvents?.some((te) => te.id === e.id)
  );

  return {
    current: tickResult.newTime,
    totalTurns: state.totalTurns + turnsAdvanced,
    lastActiveAt: new Date().toISOString(),
    currentPeriod: tickResult.newPeriod?.name ?? state.currentPeriod,
    pendingTimeEvents: remainingEvents?.length ? remainingEvents : undefined,
  };
}
