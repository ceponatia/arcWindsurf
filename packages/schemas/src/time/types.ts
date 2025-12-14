/**
 * Time System Types
 *
 * Core type definitions for the game time system.
 * These are domain-scoped types specific to time tracking.
 *
 * @see dev-docs/26-time-system.md
 */

// =============================================================================
// Game Time Types
// =============================================================================

/**
 * In-game time representation.
 * Supports configurable calendars (fantasy months, different day lengths, etc.)
 */
export interface GameTime {
  /** Year number (1-indexed) */
  year: number;
  /** Month of the year (1-indexed) */
  month: number;
  /** Day of the month (1-indexed) */
  dayOfMonth: number;
  /** Day number since game start (1-indexed, for easy calculations) */
  absoluteDay: number;
  /** Hour of the day (0 to hoursPerDay-1) */
  hour: number;
  /** Minute of the hour (0-59) */
  minute: number;
  /** Second of the minute (0-59) */
  second: number;
}

// =============================================================================
// Time Configuration Types
// =============================================================================

/**
 * Named period of the day (dawn, morning, etc.)
 */
export interface DayPeriod {
  /** Period name (e.g., 'dawn', 'morning', 'afternoon') */
  name: string;
  /** Hour when this period starts (0 to hoursPerDay-1) */
  startHour: number;
  /** Optional description for narrative hints */
  description?: string;
}

/**
 * Season configuration for world-building.
 */
export interface SeasonConfig {
  /** Season name (e.g., 'Spring', 'Dry Season') */
  name: string;
  /** Month when season starts (1-indexed) */
  startMonth: number;
  /** Day when season starts (1-indexed) */
  startDay: number;
  /** Optional description for narrative hints */
  description?: string;
}

/**
 * Holiday/special event configuration.
 */
export interface HolidayConfig {
  /** Holiday name (e.g., 'Festival of Lights') */
  name: string;
  /** Month of the holiday (1-indexed) */
  month: number;
  /** Day of the holiday (1-indexed) */
  day: number;
  /** Optional description */
  description?: string;
  /** Does this holiday affect NPC schedules? */
  affectsSchedules: boolean;
}

/**
 * Custom calendar configuration.
 * Allows fantasy/sci-fi settings to define their own calendars.
 */
export interface CalendarConfig {
  /** Names for months (length should match monthsPerYear) */
  monthNames: string[];
  /** Names for days of the week (length should match daysPerWeek) */
  dayNames: string[];
  /** Season definitions */
  seasons?: SeasonConfig[];
  /** Special holidays or events */
  holidays?: HolidayConfig[];
}

/**
 * Time skip configuration.
 * Controls how players can skip/wait time.
 */
export interface TimeSkipConfig {
  /** Maximum time skip allowed in one action (in hours) */
  maxSkipHours: number;
  /** Whether to require narrative justification for skips */
  requireJustification: boolean;
  /** Minimum game time that must pass before allowing another skip */
  cooldownMinutes: number;
  /** Fun rejection messages when skip is too large */
  rejectionMessages?: string[];
}

/**
 * Complete time configuration for a setting.
 * Lives in SettingProfile to allow different settings to have different time scales.
 */
export interface TimeConfig {
  /** Time increment per turn (in seconds). Default: 60 (1 minute) */
  secondsPerTurn: number;
  /** How many hours in a day. Default: 24 (Earth standard) */
  hoursPerDay: number;
  /** How many days in a week. Default: 7 */
  daysPerWeek: number;
  /** How many days in a month. Default: 30 */
  daysPerMonth: number;
  /** How many months in a year. Default: 12 */
  monthsPerYear: number;
  /** Named periods of the day with start hours */
  dayPeriods: DayPeriod[];
  /** Calendar configuration (month/day names, seasons) */
  calendar?: CalendarConfig;
  /** Starting time when a new session begins */
  defaultStartTime: GameTime;
  /** Whether to simulate time passing between sessions */
  simulateOfflineTime: boolean;
  /** Maximum hours to simulate if offline time is enabled */
  maxOfflineHours: number;
  /** Time skip settings for player-initiated waits */
  skipConfig?: TimeSkipConfig;
}

// =============================================================================
// Session Time State Types
// =============================================================================

/**
 * Pending time-triggered event.
 */
export interface PendingTimeEvent {
  /** Unique event identifier */
  id: string;
  /** When the event should trigger */
  triggerTime: GameTime;
  /** Type of event (for handler routing) */
  eventType: string;
  /** Event-specific payload */
  payload: Record<string, unknown>;
}

/**
 * Session-level time state.
 * Stored in session_time_state table as JSONB.
 */
export interface SessionTimeState {
  /** Current game time */
  current: GameTime;
  /** Accumulated turn count for this session */
  totalTurns: number;
  /** Last time the session was active (real-world ISO timestamp) */
  lastActiveAt: string;
  /** Cached current day period for quick access */
  currentPeriod: string;
  /** Optional: time-locked events that haven't triggered yet */
  pendingTimeEvents?: PendingTimeEvent[] | undefined;
}

// =============================================================================
// Time Context Types (for agents/prompts)
// =============================================================================

/**
 * Time slice for turn context.
 * Passed to agents and used in prompt building.
 */
export interface TimeSlice {
  /** Current in-game time */
  current: GameTime;
  /** Human-readable time string, e.g., "Day 3, 14:30" */
  formatted: string;
  /** Current period of day, e.g., "afternoon" */
  period: string;
  /** Period description for narration hints */
  periodDescription: string;
  /** Total turns elapsed in this session */
  totalTurns: number;
  /** Day name from calendar (if configured) */
  dayName?: string | undefined;
  /** Month name from calendar (if configured) */
  monthName?: string | undefined;
  /** Current season (if configured) */
  season?: string | undefined;
}

/**
 * Time format options for display.
 */
export interface TimeFormatOptions {
  /** Include day number */
  showDay: boolean;
  /** Use 24-hour or 12-hour format */
  use24Hour: boolean;
  /** Include seconds */
  showSeconds: boolean;
  /** Include period name */
  showPeriod: boolean;
}

// =============================================================================
// Time Advancement Types
// =============================================================================

/**
 * Result of advancing time (tick).
 */
export interface TickResult {
  /** Time before advancement */
  previousTime: GameTime;
  /** Time after advancement */
  newTime: GameTime;
  /** Whether the day period changed */
  periodChanged: boolean;
  /** New period (if changed) */
  newPeriod?: DayPeriod | undefined;
  /** Whether the day changed */
  dayChanged: boolean;
  /** Events that triggered during this tick */
  triggeredEvents?: PendingTimeEvent[] | undefined;
}

/**
 * Result of validating a time skip request.
 */
export interface TimeSkipValidationResult {
  /** Whether the skip is allowed */
  allowed: boolean;
  /** Requested skip in hours */
  requestedHours: number;
  /** Maximum allowed hours */
  maxAllowedHours: number;
  /** Rejection message (if not allowed) */
  rejectionMessage?: string | undefined;
}

// =============================================================================
// Narrative POV Types
// =============================================================================

/**
 * Narrative point-of-view mode for time skips.
 * - player-only: Only show what the player experiences
 * - intimate-dual: Show POV of close NPCs during skips
 * - omniscient: Show what any relevant NPC is doing
 */
export type NarrativePOVMode = 'player-only' | 'intimate-dual' | 'omniscient';

/**
 * Session narrative configuration.
 */
export interface SessionNarrativeConfig {
  /** How to handle POV during player-initiated time skips */
  skipPOV: NarrativePOVMode;
  /** For intimate-dual mode: which NPCs get POV scenes */
  povCharacterIds?: string[];
}
