/**
 * Time System Zod Schemas
 *
 * Runtime validation schemas for time system data.
 *
 * @see dev-docs/26-time-system.md
 */
import { z } from 'zod';

// =============================================================================
// Game Time Schema
// =============================================================================

/**
 * Schema for in-game time representation.
 */
export const GameTimeSchema = z.object({
  /** Year number (1-indexed) */
  year: z.number().int().min(1).describe('Year number (1-indexed)'),
  /** Month of the year (1-indexed) */
  month: z.number().int().min(1).describe('Month of the year (1-indexed)'),
  /** Day of the month (1-indexed) */
  dayOfMonth: z.number().int().min(1).describe('Day of the month (1-indexed)'),
  /** Day number since game start (1-indexed) */
  absoluteDay: z.number().int().min(1).describe('Day number since game start (1-indexed)'),
  /** Hour of the day (0 to hoursPerDay-1) */
  hour: z.number().int().min(0).describe('Hour of the day'),
  /** Minute of the hour (0-59) */
  minute: z.number().int().min(0).max(59).describe('Minute of the hour'),
  /** Second of the minute (0-59) */
  second: z.number().int().min(0).max(59).describe('Second of the minute'),
});

// =============================================================================
// Time Configuration Schemas
// =============================================================================

/**
 * Schema for named day periods.
 */
export const DayPeriodSchema = z.object({
  name: z.string().describe('Period name (e.g., dawn, morning, afternoon)'),
  startHour: z.number().int().min(0).describe('Hour when this period starts'),
  description: z.string().optional().describe('Description for narrative hints'),
});

/**
 * Schema for season configuration.
 */
export const SeasonConfigSchema = z.object({
  name: z.string().describe('Season name'),
  startMonth: z.number().int().min(1).describe('Month when season starts'),
  startDay: z.number().int().min(1).describe('Day when season starts'),
  description: z.string().optional().describe('Season description'),
});

/**
 * Schema for holiday configuration.
 */
export const HolidayConfigSchema = z.object({
  name: z.string().describe('Holiday name'),
  month: z.number().int().min(1).describe('Month of the holiday'),
  day: z.number().int().min(1).describe('Day of the holiday'),
  description: z.string().optional().describe('Holiday description'),
  affectsSchedules: z.boolean().describe('Does this holiday affect NPC schedules?'),
});

/**
 * Schema for calendar configuration.
 */
export const CalendarConfigSchema = z.object({
  monthNames: z.array(z.string()).describe('Names for months'),
  dayNames: z.array(z.string()).describe('Names for days of the week'),
  seasons: z.array(SeasonConfigSchema).optional().describe('Season definitions'),
  holidays: z.array(HolidayConfigSchema).optional().describe('Holiday definitions'),
});

/**
 * Schema for time skip configuration.
 */
export const TimeSkipConfigSchema = z.object({
  maxSkipHours: z.number().min(0).describe('Maximum time skip in hours'),
  requireJustification: z.boolean().describe('Require narrative justification'),
  cooldownMinutes: z.number().int().min(0).describe('Cooldown between skips'),
  rejectionMessages: z.array(z.string()).optional().describe('Fun rejection messages'),
});

/**
 * Schema for complete time configuration.
 * Lives in SettingProfile.
 */
export const TimeConfigSchema = z.object({
  secondsPerTurn: z.number().int().min(1).default(60).describe('Time per turn in seconds'),
  hoursPerDay: z.number().int().min(1).default(24).describe('Hours in a day'),
  daysPerWeek: z.number().int().min(1).default(7).describe('Days in a week'),
  daysPerMonth: z.number().int().min(1).default(30).describe('Days in a month'),
  monthsPerYear: z.number().int().min(1).default(12).describe('Months in a year'),
  dayPeriods: z.array(DayPeriodSchema).describe('Named periods of the day'),
  calendar: CalendarConfigSchema.optional().describe('Calendar configuration'),
  /** Starting time for new sessions */
  defaultStartTime: GameTimeSchema,
  simulateOfflineTime: z.boolean().default(false).describe('Simulate offline time'),
  maxOfflineHours: z.number().min(0).default(0).describe('Max offline hours to simulate'),
  skipConfig: TimeSkipConfigSchema.optional().describe('Time skip configuration'),
});

// =============================================================================
// Session Time State Schemas
// =============================================================================

/**
 * Schema for pending time events.
 */
export const PendingTimeEventSchema = z.object({
  id: z.string().describe('Unique event identifier'),
  /** When to trigger */
  triggerTime: GameTimeSchema,
  eventType: z.string().describe('Event type for routing'),
  /** Event-specific payload */
  payload: z.record(z.string(), z.unknown()),
});

/**
 * Schema for session time state (stored in DB).
 */
export const SessionTimeStateSchema = z.object({
  /** Current game time */
  current: GameTimeSchema,
  totalTurns: z.number().int().min(0).default(0).describe('Accumulated turn count'),
  lastActiveAt: z.string().datetime().describe('Last active timestamp (ISO)'),
  currentPeriod: z.string().describe('Current day period name'),
  pendingTimeEvents: z.array(PendingTimeEventSchema).optional().describe('Pending events'),
});

// =============================================================================
// Time Context Schemas (for agents/prompts)
// =============================================================================

/**
 * Schema for time slice passed to agents.
 */
export const TimeSliceSchema = z.object({
  /** Current game time */
  current: GameTimeSchema,
  formatted: z.string().describe('Human-readable time string'),
  period: z.string().describe('Current period name'),
  periodDescription: z.string().describe('Period description for narration'),
  totalTurns: z.number().int().min(0).describe('Total turns in session'),
  dayName: z.string().optional().describe('Day name from calendar'),
  monthName: z.string().optional().describe('Month name from calendar'),
  season: z.string().optional().describe('Current season'),
});

/**
 * Schema for time format options.
 */
export const TimeFormatOptionsSchema = z.object({
  showDay: z.boolean().default(true).describe('Include day number'),
  use24Hour: z.boolean().default(true).describe('Use 24-hour format'),
  showSeconds: z.boolean().default(false).describe('Include seconds'),
  showPeriod: z.boolean().default(true).describe('Include period name'),
});

// =============================================================================
// Time Advancement Schemas
// =============================================================================

/**
 * Schema for tick result.
 */
export const TickResultSchema = z.object({
  /** Time before tick */
  previousTime: GameTimeSchema,
  /** Time after tick */
  newTime: GameTimeSchema,
  periodChanged: z.boolean().describe('Whether period changed'),
  newPeriod: DayPeriodSchema.optional().describe('New period if changed'),
  dayChanged: z.boolean().describe('Whether day changed'),
  triggeredEvents: z.array(PendingTimeEventSchema).optional().describe('Triggered events'),
});

/**
 * Schema for time skip validation result.
 */
export const TimeSkipValidationResultSchema = z.object({
  allowed: z.boolean().describe('Whether skip is allowed'),
  requestedHours: z.number().describe('Requested skip in hours'),
  maxAllowedHours: z.number().describe('Maximum allowed hours'),
  rejectionMessage: z.string().optional().describe('Rejection message'),
});

// =============================================================================
// Narrative POV Schemas
// =============================================================================

/**
 * Schema for narrative POV mode.
 */
export const NarrativePOVModeSchema = z.enum(['player-only', 'intimate-dual', 'omniscient']);

/**
 * Schema for session narrative configuration.
 */
export const SessionNarrativeConfigSchema = z.object({
  /** POV mode for time skips */
  skipPOV: NarrativePOVModeSchema,
  povCharacterIds: z.array(z.string()).optional().describe('NPCs with POV scenes'),
});

// =============================================================================
// Inferred Types from Schemas
// =============================================================================

export type GameTimeSchemaType = z.infer<typeof GameTimeSchema>;
export type DayPeriodSchemaType = z.infer<typeof DayPeriodSchema>;
export type SeasonConfigSchemaType = z.infer<typeof SeasonConfigSchema>;
export type HolidayConfigSchemaType = z.infer<typeof HolidayConfigSchema>;
export type CalendarConfigSchemaType = z.infer<typeof CalendarConfigSchema>;
export type TimeSkipConfigSchemaType = z.infer<typeof TimeSkipConfigSchema>;
export type TimeConfigSchemaType = z.infer<typeof TimeConfigSchema>;
export type PendingTimeEventSchemaType = z.infer<typeof PendingTimeEventSchema>;
export type SessionTimeStateSchemaType = z.infer<typeof SessionTimeStateSchema>;
export type TimeSliceSchemaType = z.infer<typeof TimeSliceSchema>;
export type TimeFormatOptionsSchemaType = z.infer<typeof TimeFormatOptionsSchema>;
export type TickResultSchemaType = z.infer<typeof TickResultSchema>;
export type TimeSkipValidationResultSchemaType = z.infer<typeof TimeSkipValidationResultSchema>;
export type NarrativePOVModeSchemaType = z.infer<typeof NarrativePOVModeSchema>;
export type SessionNarrativeConfigSchemaType = z.infer<typeof SessionNarrativeConfigSchema>;
