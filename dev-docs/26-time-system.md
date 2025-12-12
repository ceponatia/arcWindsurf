# Time System

> **Status**: BRAINSTORM
> **Last Updated**: December 2025

This document outlines the design for a comprehensive time system in Minimal RPG that tracks in-game time progression and enables time-aware behaviors for NPCs, events, and world state.

## 1. Design Philosophy

### 1.1 Goals

The time system should:

- **Track game time progression** - Maintain a consistent in-world clock across sessions
- **Be configurable per-setting** - Different game genres may need different time scales
- **Enable NPC scheduling** - Allow NPCs to have routines that happen when the player isn't present
- **Support time-triggered events** - Enable world events, NPC behaviors, and narrative beats tied to time
- **Inform interaction dynamics** - Allow NPCs to react to conversation duration, time of day, etc.
- **Persist across sessions** - Time state survives server restarts and session resumption

### 1.2 Core Concept: Turn-Based Time

Unlike real-time games, Minimal RPG is turn-based. Time advances discretely:

- Each **turn** (player action + NPC response cycle) advances the clock by a configurable amount
- Time advances **after** the LLM completes its response (player acts → LLM acts → time ticks)
- Time does not pass between sessions unless explicitly simulated
- The player's perception of time is through narration, not explicit timestamps

### 1.3 Narration-First Time Communication

Time is communicated to the player through natural narration, not mechanical displays:

- The LLM does **not** announce "30 seconds passed" or similar on every turn
- When significant time transitions occur (day → night, morning → afternoon), the LLM weaves this into the narrative naturally
- Examples: "The sun dipped below the horizon as they continued talking..." or "Street lights flickered on one by one..."
- The system provides time context to the LLM, but the LLM decides when and how to mention it

Future enhancement: A visual UI element (sun/moon position, ambient lighting changes) could complement the narration, but this is a later feature.

## 2. Time Configuration

### 2.1 Setting-Level Configuration

Time configuration lives in the `SettingProfile`, allowing different settings to have different time scales:

```typescript
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

export interface DayPeriod {
  name: string; // e.g., 'dawn', 'morning', 'afternoon', 'evening', 'night'
  startHour: number; // 0-23
  description?: string; // e.g., 'The sun rises over the horizon'
}

export interface GameTime {
  /** Year number (1-indexed) */
  year: number;
  /** Month of the year (1-indexed) */
  month: number;
  /** Day of the month (1-indexed) */
  dayOfMonth: number;
  /** Day number since game start (1-indexed, for easy calculations) */
  absoluteDay: number;
  /** Hour of the day (0-23) */
  hour: number;
  /** Minute of the hour (0-59) */
  minute: number;
  /** Second of the minute (0-59) */
  second: number;
}
```

### 2.2 Example Configurations

**Modern/Contemporary Setting (Default)**:

```typescript
const modernTimeConfig: TimeConfig = {
  secondsPerTurn: 60, // 1 minute per turn
  hoursPerDay: 24,
  daysPerWeek: 7,
  daysPerMonth: 30,
  monthsPerYear: 12,
  dayPeriods: [
    { name: 'night', startHour: 0, description: 'The city sleeps under dim streetlights' },
    { name: 'dawn', startHour: 5, description: 'First light breaks through the urban skyline' },
    { name: 'morning', startHour: 7, description: 'The morning rush begins' },
    { name: 'midday', startHour: 11, description: 'The sun is high overhead' },
    { name: 'afternoon', startHour: 14, description: 'The day stretches on' },
    { name: 'evening', startHour: 18, description: 'Golden hour light fills the streets' },
    { name: 'dusk', startHour: 20, description: 'The sky fades to purple and orange' },
    { name: 'night', startHour: 22, description: 'Night settles over the city' },
  ],
  defaultStartTime: {
    year: 1,
    month: 1,
    dayOfMonth: 1,
    absoluteDay: 1,
    hour: 9,
    minute: 0,
    second: 0,
  },
  simulateOfflineTime: false,
  maxOfflineHours: 0,
};
```

**Fantasy Setting**:

```typescript
const fantasyTimeConfig: TimeConfig = {
  secondsPerTurn: 30, // 30 seconds per turn (faster-paced combat)
  hoursPerDay: 24,
  daysPerWeek: 7,
  daysPerMonth: 28, // 4 weeks exactly
  monthsPerYear: 12,
  dayPeriods: [
    { name: 'witching hour', startHour: 0, description: 'Dark magic stirs in the shadows' },
    { name: 'false dawn', startHour: 4, description: 'A faint glow hints at sunrise' },
    { name: 'dawn', startHour: 6, description: 'The sun crests the eastern mountains' },
    { name: 'morning', startHour: 8, description: 'Markets open and villagers stir' },
    { name: 'high sun', startHour: 12, description: 'The sun blazes at its peak' },
    { name: 'afternoon', startHour: 15, description: 'Shadows begin to lengthen' },
    { name: 'dusk', startHour: 18, description: 'The sun dips below the horizon' },
    { name: 'evening', startHour: 20, description: 'Taverns fill with weary travelers' },
    { name: 'night', startHour: 22, description: 'Stars emerge in the darkening sky' },
  ],
  calendar: fantasyCalendar, // Reference to fantasy calendar defined above
  defaultStartTime: {
    year: 1247, // Year of the Dragon
    month: 4, // Greenrise
    dayOfMonth: 15,
    absoluteDay: 1,
    hour: 8,
    minute: 0,
    second: 0,
  },
  simulateOfflineTime: false,
  maxOfflineHours: 0,
};
```

**Sci-Fi Space Station**:

```typescript
const spaceStationTimeConfig: TimeConfig = {
  secondsPerTurn: 120, // 2 minutes per turn (slower, more deliberate pacing)
  hoursPerDay: 20, // Non-Earth day cycle
  daysPerWeek: 5,
  daysPerMonth: 25, // 5 weeks
  monthsPerYear: 10, // Metric-ish calendar
  dayPeriods: [
    { name: 'cycle-start', startHour: 0, description: 'Station lights brighten to full' },
    { name: 'work-shift-alpha', startHour: 2, description: 'Alpha shift begins duties' },
    { name: 'midcycle', startHour: 10, description: 'Station activity peaks' },
    { name: 'work-shift-beta', startHour: 12, description: 'Beta shift takes over' },
    { name: 'cycle-end', startHour: 18, description: 'Lights dim for rest period' },
  ],
  defaultStartTime: {
    year: 2847,
    month: 7,
    dayOfMonth: 12,
    absoluteDay: 1,
    hour: 2,
    minute: 0,
    second: 0,
  },
  simulateOfflineTime: true,
  maxOfflineHours: 48,
};
```

### PM Notes

I like this design, especially being able to change the number of hours per day, etc.

### 2.3 Calendar System

For immersive world-building, settings can define custom calendars with named months, days, and seasons:

```typescript
export interface CalendarConfig {
  /** Names for months. Length should match monthsPerYear. */
  monthNames: string[];

  /** Names for days of the week. Length should match daysPerWeek. */
  dayNames: string[];

  /** Season definitions */
  seasons?: SeasonConfig[];

  /** Special holidays or events */
  holidays?: HolidayConfig[];
}

export interface SeasonConfig {
  name: string; // e.g., 'Spring', 'Dry Season', 'Harvest Time'
  startMonth: number; // 1-indexed
  startDay: number; // 1-indexed
  description?: string;
}

export interface HolidayConfig {
  name: string; // e.g., 'Festival of Lights', 'New Year'
  month: number; // 1-indexed
  day: number; // 1-indexed
  description?: string;
  /** Does this holiday affect NPC schedules? */
  affectsSchedules: boolean;
}
```

**Default Earth Calendar**:

```typescript
const defaultCalendar: CalendarConfig = {
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
    { name: 'Winter', startMonth: 12, startDay: 21 },
    { name: 'Spring', startMonth: 3, startDay: 20 },
    { name: 'Summer', startMonth: 6, startDay: 21 },
    { name: 'Autumn', startMonth: 9, startDay: 22 },
  ],
  holidays: [
    { name: 'New Year', month: 1, day: 1, affectsSchedules: true },
    { name: 'Christmas', month: 12, day: 25, affectsSchedules: true },
  ],
};
```

**Fantasy Calendar Example**:

```typescript
const fantasyCalendar: CalendarConfig = {
  monthNames: [
    'Deepwinter',
    'Clawing',
    'Thawmoon',
    'Greenrise',
    'Highbloom',
    'Sunpeak',
    'Goldfall',
    'Harvestend',
    'Mistfall',
    'Dimming',
    'Frostmarch',
    'Longnight',
  ],
  dayNames: ['Moonday', 'Tideday', 'Earthday', 'Stormday', 'Fireday', 'Starday', 'Restday'],
  seasons: [
    {
      name: 'The Long Dark',
      startMonth: 11,
      startDay: 1,
      description: 'When the sun barely rises',
    },
    { name: 'Thaw', startMonth: 2, startDay: 15, description: 'Ice melts and rivers swell' },
    { name: 'Growing', startMonth: 4, startDay: 1, description: 'Fields come alive' },
    { name: 'High Summer', startMonth: 6, startDay: 1, description: 'The sun rules the sky' },
    { name: 'Harvest', startMonth: 8, startDay: 1, description: 'Time to reap what was sown' },
  ],
  holidays: [
    {
      name: 'Festival of Flames',
      month: 6,
      day: 21,
      description: 'Celebrating the longest day',
      affectsSchedules: true,
    },
    {
      name: 'Night of Ancestors',
      month: 10,
      day: 31,
      description: 'When the veil between worlds thins',
      affectsSchedules: true,
    },
  ],
};
```

The calendar is optional - if not provided, the system uses sensible defaults. The LLM can reference calendar information naturally in narration when appropriate (e.g., "It was the third day of Harvestend..." or "The Festival of Flames was only a week away...").

### 2.4 Time Skip Configuration

Settings can configure limits on player-initiated time skips to maintain narrative coherence:

```typescript
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

const defaultSkipConfig: TimeSkipConfig = {
  maxSkipHours: 24, // Can skip up to a day
  requireJustification: false,
  cooldownMinutes: 0,
  rejectionMessages: [
    "Whoa there, time traveler! Let's keep things reasonable.",
    "Even wizards can't bend time that much.",
    'The universe politely declines to skip that far ahead.',
    'Nice try, but the narrative thread would snap.',
  ],
};
```

## 3. Time State Persistence

### 3.1 Session Time Slice

Time state is stored per-session in the existing `session_time_state` table:

```typescript
export interface SessionTimeState {
  /** Current game time */
  current: GameTime;

  /** Accumulated turn count for this session */
  totalTurns: number;

  /** Last time the session was active (real-world timestamp) */
  lastActiveAt: string; // ISO timestamp

  /** Cached current day period for quick access */
  currentPeriod: string;

  /** Optional: time-locked events that haven't triggered yet */
  pendingTimeEvents?: PendingTimeEvent[];
}

export interface PendingTimeEvent {
  id: string;
  triggerTime: GameTime;
  eventType: string;
  payload: Record<string, unknown>;
}
```

### 3.2 Time Advancement Logic

```typescript
/**
 * Advance game time by the configured amount per turn.
 * Called at the end of each turn processing cycle, AFTER the LLM response.
 */
export function advanceTime(current: GameTime, config: TimeConfig, turns: number = 1): GameTime {
  const totalSeconds = turns * config.secondsPerTurn;

  let { year, month, dayOfMonth, absoluteDay, hour, minute, second } = current;

  second += totalSeconds;

  // Cascade overflow: seconds -> minutes
  minute += Math.floor(second / 60);
  second = second % 60;

  // minutes -> hours
  hour += Math.floor(minute / 60);
  minute = minute % 60;

  // hours -> days
  const daysToAdd = Math.floor(hour / config.hoursPerDay);
  hour = hour % config.hoursPerDay;
  dayOfMonth += daysToAdd;
  absoluteDay += daysToAdd;

  // days -> months
  while (dayOfMonth > config.daysPerMonth) {
    dayOfMonth -= config.daysPerMonth;
    month += 1;

    // months -> years
    if (month > config.monthsPerYear) {
      month = 1;
      year += 1;
    }
  }

  return { year, month, dayOfMonth, absoluteDay, hour, minute, second };
}

/**
 * Get the current day period based on the hour.
 */
export function getCurrentPeriod(time: GameTime, config: TimeConfig): DayPeriod {
  // Find the period whose start hour is <= current hour
  // Periods are assumed to be sorted by startHour
  const periods = [...config.dayPeriods].sort((a, b) => b.startHour - a.startHour);
  return periods.find((p) => time.hour >= p.startHour) ?? periods[periods.length - 1];
}

/**
 * Get the current day of the week (0-indexed).
 */
export function getDayOfWeek(time: GameTime, config: TimeConfig): number {
  return (time.absoluteDay - 1) % config.daysPerWeek;
}

/**
 * Get the named day from the calendar (if configured).
 */
export function getDayName(time: GameTime, config: TimeConfig): string | undefined {
  if (!config.calendar?.dayNames) return undefined;
  const dayIndex = getDayOfWeek(time, config);
  return config.calendar.dayNames[dayIndex];
}

/**
 * Get the named month from the calendar (if configured).
 */
export function getMonthName(time: GameTime, config: TimeConfig): string | undefined {
  if (!config.calendar?.monthNames) return undefined;
  return config.calendar.monthNames[time.month - 1]; // month is 1-indexed
}

/**
 * Get the current season (if configured).
 */
export function getCurrentSeason(time: GameTime, config: TimeConfig): SeasonConfig | undefined {
  const seasons = config.calendar?.seasons;
  if (!seasons || seasons.length === 0) return undefined;

  // Find the season that contains the current date
  // Seasons are defined by start date, so find the latest one that has started
  const sorted = [...seasons].sort((a, b) => {
    const aVal = a.startMonth * 100 + a.startDay;
    const bVal = b.startMonth * 100 + b.startDay;
    return bVal - aVal;
  });

  const currentVal = time.month * 100 + time.dayOfMonth;
  return (
    sorted.find((s) => currentVal >= s.startMonth * 100 + s.startDay) ?? sorted[sorted.length - 1]
  );
}
```

### 3.3 Lightweight Tick Tool

To avoid bottlenecks, time advancement is handled by a lightweight tool that runs after each LLM response:

```typescript
/**
 * Tick tool - called by the governor after LLM response completion.
 * This is intentionally minimal to avoid slowing down the turn cycle.
 */
export interface TickResult {
  previousTime: GameTime;
  newTime: GameTime;
  periodChanged: boolean;
  newPeriod?: DayPeriod;
  dayChanged: boolean;
  triggeredEvents?: PendingTimeEvent[];
}

export async function tick(
  sessionId: string,
  config: TimeConfig,
  turns: number = 1
): Promise<TickResult> {
  // 1. Load current time state (already in memory from turn context)
  const currentState = await getSessionTimeState(sessionId);
  const previousTime = currentState.current;
  const previousPeriod = getCurrentPeriod(previousTime, config);

  // 2. Advance time
  const newTime = advanceTime(previousTime, config, turns);
  const newPeriod = getCurrentPeriod(newTime, config);

  // 3. Check for period/day transitions
  const periodChanged = previousPeriod.name !== newPeriod.name;
  const dayChanged = previousTime.absoluteDay !== newTime.absoluteDay;

  // 4. Check for triggered time events
  const triggeredEvents = checkPendingEvents(currentState.pendingTimeEvents ?? [], newTime);

  // 5. Persist new state
  await updateSessionTimeState(sessionId, {
    current: newTime,
    totalTurns: currentState.totalTurns + turns,
    lastActiveAt: new Date().toISOString(),
    currentPeriod: newPeriod.name,
    pendingTimeEvents: filterTriggeredEvents(currentState.pendingTimeEvents ?? [], triggeredEvents),
  });

  return {
    previousTime,
    newTime,
    periodChanged,
    newPeriod: periodChanged ? newPeriod : undefined,
    dayChanged,
    triggeredEvents: triggeredEvents.length > 0 ? triggeredEvents : undefined,
  };
}
```

The tick runs after every LLM response and updates the time state in a single database operation. The governor can use the `TickResult` to inform subsequent turns about significant time transitions.

### PM Notes

We need a lightweight tool to update the game turn state (ticks) so that it's not going to bottleneck anything, considering the game 'ticks' every single turn. The tick should occur _after_ the llm's part of the turn. So the player acts -> then the llm acts -> 1 iteration of game time passes.

## 4. Time in the Turn Flow

### 4.1 Integration with Governor

The governor-backed turn flow already manages a `time` slice in `TurnStateContext`. The time system integrates as follows:

1. **Turn Start**: Load current `SessionTimeState` from `session_time_state`
2. **Context Building**: Include time info in `TurnStateContext.time`
3. **Agent Processing**: Agents can read and reason about current time
4. **Turn End**: Advance time by `secondsPerTurn` and persist new state
5. **Event Check**: Evaluate any pending time events that should trigger

### 4.2 Time Context for Agents

```typescript
export interface TimeSlice {
  /** Current in-game time */
  current: GameTime;

  /** Human-readable time string, e.g., "Day 3, 14:30" */
  formatted: string;

  /** Current period of day, e.g., "afternoon" */
  period: string;

  /** Period description for narration, e.g., "The day stretches on" */
  periodDescription: string;

  /** Total turns elapsed in this session */
  totalTurns: number;
}
```

### 4.3 Time Injection in Prompts

The prompt builder can inject time context as a system message when relevant:

```typescript
function buildTimeContext(timeSlice: TimeSlice): string {
  return `[Current Time: ${timeSlice.formatted} (${timeSlice.period})]`;
}
```

This allows the LLM to naturally reference time of day in its narration without explicit prompting.

### PM Notes

Great implementations. We do not need to provide the time back to the player every turn because it'll be communicated via narration at relevant times. The llm doesn't need to say "30 seconds passed" or even mention time at all on most turns, but when, for example, enough turns go by that day starts to become night, the llm could casually mention (via smooth narration with the existing conversation) that the sun is going down, street lights are turning on, etc.

In the future, we could implement a UI system that visually tracks time like showing the current location with the sun in the sky that gradually goes down, etc... but ui features like that are far in the future.

## 5. Time-Aware Actions

### 5.1 Explicit Time Passage

Some player actions should advance time more than the default amount:

| Action Type              | Time Cost (Example)   |
| ------------------------ | --------------------- |
| Brief dialogue exchange  | 1 turn (1 min)        |
| Extended conversation    | 5-10 turns (5-10 min) |
| Travel between locations | Variable (see below)  |
| Rest / Sleep             | 8 hours               |
| Crafting / Long tasks    | Variable by task      |

This can be implemented via action-specific turn multipliers:

```typescript
export interface ActionTimeCost {
  /** Base number of turns this action takes */
  baseTurns: number;
  /** Optional modifier based on conditions */
  modifier?: (context: TurnStateContext) => number;
}

export const ACTION_TIME_COSTS: Record<string, ActionTimeCost> = {
  talk: { baseTurns: 1 },
  examine: { baseTurns: 1 },
  'travel:short': { baseTurns: 5 },
  'travel:medium': { baseTurns: 15 },
  'travel:long': { baseTurns: 60 },
  rest: { baseTurns: 480 }, // 8 hours at 1 min/turn
  sleep: { baseTurns: 480 },
  'wait:hour': { baseTurns: 60 },
};
```

### 5.2 Wait/Skip Time

Players may want to explicitly wait or skip time:

```typescript
// Intent: { type: 'wait', params: { hours: 2 } }
// Advances time by 2 hours worth of turns

function processWaitAction(hours: number, config: TimeConfig): number {
  const secondsToWait = hours * 60 * 60;
  return Math.ceil(secondsToWait / config.secondsPerTurn);
}
```

During wait actions, background NPC routines should be simulated (see [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md)).

### PM Notes

All great ideas and I was hoping you'd mention the ability to skip/wait. So, we do want to allow this in certain circumstances, but since this is a game and not just a chatbot that does everything the player says, we need some guards in place sometimes. So the player can't just say "5 years pass and now we're doing this"; the LLM would return an out of character system note like "Don't be ridiculous..." or something fun. But saying something like "5 minutes pass..." would be okay as long as the setting allowed it. I suppose this could be a configurable setting.

### 5.3 Time Skip Validation

When players request time skips, the system validates the request against the setting's `TimeSkipConfig`:

```typescript
export interface TimeSkipValidationResult {
  allowed: boolean;
  requestedHours: number;
  maxAllowedHours: number;
  rejectionMessage?: string;
}

/**
 * Validate a player's time skip request.
 * Returns whether the skip is allowed and a humorous rejection if not.
 */
export function validateTimeSkip(
  requestedSeconds: number,
  config: TimeConfig
): TimeSkipValidationResult {
  const requestedHours = requestedSeconds / 3600;
  const maxAllowed = config.skipConfig?.maxSkipHours ?? 24;

  if (requestedHours <= maxAllowed) {
    return { allowed: true, requestedHours, maxAllowedHours: maxAllowed };
  }

  // Pick a fun rejection message
  const messages = config.skipConfig?.rejectionMessages ?? DEFAULT_REJECTIONS;
  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    allowed: false,
    requestedHours,
    maxAllowedHours: maxAllowed,
    rejectionMessage: message,
  };
}

const DEFAULT_REJECTIONS = [
  "[OOC: Whoa there, time traveler! Let's keep things within a day at most.]",
  "[OOC: Even the most powerful magic can't bend time that far. Try something smaller?]",
  '[OOC: The universe politely declines to skip ahead that much. How about a few hours instead?]',
  "[OOC: Nice try! But let's not break the space-time continuum today.]",
  '[OOC: If I let time skip that far, the butterflies would never forgive me for the chaos.]',
  "[OOC: Time is a river, not a teleporter. Let's wade, not warp.]",
];
```

**Example rejection in context**:

```text
Player: "A year passes and I've become a master swordsman."

LLM Response: [OOC: Nice try! But let's not break the space-time continuum today.
If you'd like to train and improve your skills, we can explore that journey
together - one session at a time. How about we start with finding a trainer?]
```

### 5.4 Narrative POV During Time Skips

How time skips are narrated depends on the session type and character relationships:

**Multi-NPC Sessions (Standard)**:
When multiple NPCs exist in the world, time skips focus on the player's experience:

```text
Player: "I wait until evening."

LLM: The afternoon passes slowly. You find a bench by the fountain and watch
the shadows lengthen across the cobblestones. Shopkeepers begin closing their
stalls, and the lamplighters make their rounds. By the time the last orange
glow fades from the sky, evening has settled over the market district.
```

Background NPCs are simulated (see schedules doc) but not narrated unless they interact with the player.

**1-on-1 Intimate Sessions**:
For sessions focused on a single NPC relationship, time skips can show what the NPC is doing:

```text
Player: "I head home for the night."

LLM: You make your way back to your apartment, the conversation with Elara
still playing through your mind.

Meanwhile, in her own room across the city, Elara sits on her bed, flipping
through a magazine without really seeing the pages. She catches herself
smiling at something you said earlier, then shakes her head and reaches
for her phone - but sets it back down. Not yet. She'll text you tomorrow.
```

This narrative POV mode can be configured per-session:

```typescript
export type NarrativePOVMode = 'player-only' | 'intimate-dual' | 'omniscient';

export interface SessionNarrativeConfig {
  /** How to handle POV during player-initiated time skips */
  skipPOV: NarrativePOVMode;

  /** For intimate-dual mode: which NPCs get POV scenes */
  povCharacterIds?: string[];
}
```

The LLM is prompted with this configuration so it knows when to show NPC perspectives during quiet moments.

## 6. Time Display & Narration

### 6.1 Formatting Options

```typescript
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

export function formatGameTime(time: GameTime, options: Partial<TimeFormatOptions> = {}): string {
  const { showDay = true, use24Hour = true, showSeconds = false, showPeriod = false } = options;

  const parts: string[] = [];

  if (showDay) {
    parts.push(`Day ${time.day}`);
  }

  let hourStr: string;
  if (use24Hour) {
    hourStr = `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  } else {
    const hour12 = time.hour % 12 || 12;
    const ampm = time.hour < 12 ? 'AM' : 'PM';
    hourStr = `${hour12}:${time.minute.toString().padStart(2, '0')} ${ampm}`;
  }

  if (showSeconds) {
    hourStr += `:${time.second.toString().padStart(2, '0')}`;
  }

  parts.push(hourStr);

  return parts.join(', ');
}
```

### 6.2 Narration Integration

The NPC agent and narrator can use time context for atmospheric description:

```typescript
const TIME_NARRATION_HINTS: Record<string, string[]> = {
  dawn: [
    'The first rays of sunlight filter through',
    'Early morning mist clings to the ground',
    'The world is quiet, just waking',
  ],
  morning: ['Morning light fills the space', 'The day has begun in earnest'],
  midday: ['The sun is at its peak', 'Shadows are short and sharp'],
  afternoon: ['The afternoon sun streams in', 'Shadows begin to lengthen'],
  evening: ['Golden evening light bathes everything', 'The day is winding down'],
  dusk: ['Twilight colors paint the sky', 'The last light of day fades'],
  night: ['Darkness has settled in', 'Night sounds fill the air', 'The world is wrapped in shadow'],
};
```

### PM Notes

Yes this is what I was talking about earlier in the document so good call outs. We would want definable "milestones" like dawn, etc. but we also don't necessarily want to hard code them into the game or make yet another set of fields the user has to fill out before creating a session... the llm should be able to intelligently write narrative for the passage fo time. We do need to track seconds/minutes/hours and also days/monts/years in most settings so those are all good things to store.

## 7. Schema Integration

### 7.1 SettingProfile Extension

Add `timeConfig` to the existing `SettingProfileSchema`:

```typescript
// In packages/schemas/src/setting/settingProfile.ts

export const TimeConfigSchema = z.object({
  secondsPerTurn: z.number().min(1).default(60),
  hoursPerDay: z.number().min(1).max(100).default(24),
  daysPerWeek: z.number().min(1).max(30).default(7),
  dayPeriods: z.array(DayPeriodSchema).min(1),
  defaultStartTime: GameTimeSchema,
  simulateOfflineTime: z.boolean().default(false),
  maxOfflineHours: z.number().min(0).default(0),
});

export const SettingProfileSchema = SettingBasicsSchema.extend({
  // ... existing fields

  /** Time configuration for this setting */
  timeConfig: TimeConfigSchema.optional(),
});
```

### 7.2 Session Time State Table

The existing `session_time_state` table schema in `packages/db/sql/005_session_state_slices.sql` stores `state_json JSONB`. The `SessionTimeState` interface above defines the expected shape of that JSON.

## 8. Turn Duration Variants

### 8.1 Configurable Turn Durations

Different scenarios may call for different time scales within the same setting:

| Scenario            | Suggested Duration          |
| ------------------- | --------------------------- |
| Casual conversation | 30-60 seconds               |
| Combat / Action     | 6 seconds (D&D-style round) |
| Investigation       | 5-10 minutes                |
| Travel narration    | 30-60 minutes               |
| Time skip           | Hours to days               |

**Important**: These are time cost hints for actions, not separate turn phases. All actions in a player's turn are processed sequentially by the LLM and its tools. The time cost accumulates and is applied at the end of the turn via the tick.

This could be handled via **action time multipliers**:

```typescript
export const ACTION_TIME_MULTIPLIERS: Record<string, number> = {
  talk: 1, // Uses base secondsPerTurn
  examine_brief: 1, // Quick glance
  examine_careful: 5, // Careful study (5x base)
  combat_round: 0.1, // 1/10th of base (6 seconds if base is 60)
  travel_short: 5, // 5x base (5 minutes if base is 60)
  travel_medium: 30, // 30x base (30 minutes if base is 60)
  travel_long: 60, // 60x base (1 hour if base is 60)
  wait: 60, // 60x base (1 hour if base is 60)
};
```

### PM Notes

Those are good durations. We have to be careful with classifying them with intents though because sometimes the LLM trips up and doesn't recognize some intents correctly. For example with investigation taking 5-10 minutes... we would want that with an action like making a careful study of a room or an arcane object, but if the player simply looks at a character carefully to get more detail about them, we need to ensure the LLM doesn't classify that as needing to pass 10 minutes.

### 8.2 Intent Classification Guidance

To avoid mis-classification, the intent classifier should use explicit signals rather than just keywords:

| Player Action                      | Intent            | Time Cost | Why                                   |
| ---------------------------------- | ----------------- | --------- | ------------------------------------- |
| "I look at her"                    | `examine_brief`   | 1x        | Quick observation                     |
| "I study the runes on the door"    | `examine_careful` | 5x        | Deliberate study of an object         |
| "I search the room thoroughly"     | `investigate`     | 5x        | Systematic investigation              |
| "What does she look like?"         | `describe`        | 0x        | Request for description, no time cost |
| "I examine the artifact carefully" | `examine_careful` | 5x        | Keyword "carefully" signals intent    |

**Disambiguation rules**:

1. **"look at" vs "study/examine carefully"**: Quick observations don't cost extra time
2. **Character descriptions**: Describing an NPC's appearance is a narrative function, not an in-game action
3. **Keywords matter**: Words like "thoroughly", "carefully", "closely", "search" signal time-intensive actions
4. **Context matters**: Looking at a simple object vs. an arcane artifact may have different implications

The LLM should err on the side of shorter time costs unless the player explicitly signals a time-intensive action.

## 9. Open Questions (with PM Notes and Resolutions)

### Resolved

1. **Offline Time Simulation**: If `simulateOfflineTime` is enabled, how much background simulation should occur? Full NPC schedule simulation could be expensive.

   > **PM Notes**: Rather than simulating everything offline, we could instead look at an online atomic clock, determine how much time has passed since the user was last online (by the time the last prompt was entered) and then update state accordingly through an efficient algorithmic series of steps, ideally.

   **Resolution**: Use a delta-based approach. On session resume, calculate elapsed real-world time, apply it to game time (up to `maxOfflineHours`), and update NPC states algorithmically rather than simulating each tick. This is covered in [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md).

2. **Calendar Systems**: Should we support named days, months, seasons, or holidays?

   > **PM Notes**: Absolutely! These would be defined by default as real world names but we could allow the user to configure their own calendar.

   **Resolution**: Implemented via `CalendarConfig` in section 2.3. Default Earth calendar provided, with full customization for fantasy/sci-fi settings.

3. **Time Compression**: During long waits or travel, should we summarize what happened or just skip?

   > **PM Notes**: I think so but only from the player's point of view. We don't need to summarize what happens with npcs or locations they can't see, unless those npcs are main characters or something where it's useful for the narrative to know what they did.
   > This brings up a good point about narration. Say we have a session with one player and one npc. Normally in a game where there are dozens or more npcs in the background, we wouldn't want to know what they're doing at all times. But, for a 1 on 1 narrative, it is not only useful but desirable to have the llm's turn say something like "while in her room, Elara laid on her bed and flipped through a magazine, thinking about _user_" even though the player may be in his own home.

   **Resolution**: Implemented via `NarrativePOVMode` in section 5.4. Sessions can be configured as `player-only`, `intimate-dual`, or `omniscient` to control POV during time skips.

4. **Turn Mode Detection**: How should the system automatically detect when to switch between conversation, action, and exploration modes?

   > **PM Notes**: I'm not sure I understand. These modes aren't turn-based, they're just a way for the llm to understand which parts of a user's prompt should be handled in certain ways. There shouldn't be a 'turn' just for exploration and then another for action, it all happens in the same turn sequentially, parsed by the llm and its tools.

   **Resolution**: Turn modes are not separate phases but hints for the LLM's processing within a single turn. The intent classifier assigns time costs based on action type, but all actions in a turn are processed sequentially. Section 8 updated to clarify this is about time cost hints, not turn phases.

5. **Save/Load State**: When a player returns to a saved session, should time have passed, or should it resume exactly where they left off?

   > **PM Notes**: Normally it should resume. We could allow a flag for the game state to update based on an online clock and how much time has passed since the user was last online, but this would be an enhanced feature we may not need right now. We'd need to expand on background routines and npc behavior a lot before we could implement this.

   **Resolution**: Default to resume (time paused). `simulateOfflineTime` flag exists for future implementation when background routines are more developed.

6. **Real-Time Elements**: Are there any cases where real-world time should affect game time (e.g., daily login bonuses)?

   > **PM Notes**: We could implement this but not at this time.

   **Resolution**: Deferred. The `lastActiveAt` timestamp is stored for future use if needed.

### Remaining Open Questions

1. **Time Zones / Multiple Locations**: For settings spanning multiple time zones, should location affect local time?

   > **PM Notes**: That would be a cool feature for settings in which players move around the world or space a lot but it seems hard to implement because somehow someone would have to define all the different time zones, especially for a hand-crafted universe. Perhaps in those situations it would be more of a universal clock. You could have a planet that had much shorter days and implement that in the setting, but wouldn't need to mess with the global time much, I don't think.

   **Status**: Deferred as a future enhancement. Current design uses a universal clock per-setting. Different planets/regions could have different `TimeConfig` if truly needed, but the added complexity may not be worth it for most settings.

2. **Multi-Day Events**: How should long-running events (festivals, sieges, etc.) interact with the time system? Should they be tracked separately from pending time events?

   > **PM Notes**: that's an interesting question. Maybe we could have self-contained events break out into their own time schema which is slightly accelerated. Take a siege for example: we don't want the player to have to take every single minute action during a siege, the narrative and gameplay could stick to major events such as breaching the gates, scaling the walls, assaulting the citadel, etc. There could be turn-based-combat inside those events but overall the whole event would move faster than ordinary talk & act turns.

3. **Time Perception**: Should different characters perceive time differently? (e.g., immortal beings, time-dilated areas)

   > **PM Notes**: Good instinct but let's defer this for possible implementation later.

## 10. Next Steps

### Phase 1: Core Time Infrastructure

1. Add `TimeConfigSchema`, `GameTimeSchema`, `CalendarConfigSchema` to `@minimal-rpg/schemas`
2. Extend `SettingProfileSchema` with optional `timeConfig`
3. Implement `advanceTime()`, `getCurrentPeriod()`, and calendar helper functions
4. Add `tick()` tool for lightweight post-turn time advancement
5. Update `session_time_state` persistence to use the new `SessionTimeState` schema

### Phase 2: LLM Integration

1. Add time context injection to the prompt builder (period, formatted time, season)
2. Implement `NarrativePOVMode` and session narrative configuration
3. Add time skip validation with configurable guards and rejection messages
4. Document prompting guidelines for natural time narration

### Phase 3: Enhanced Features (Future)

1. Implement offline time simulation with delta-based state updates
2. Add holiday and event detection for schedule modifications
3. Visual UI elements for time display (sun position, ambient lighting)
4. Real-time clock integration for live-updating sessions

## 11. Related Documents

- [07-state-and-persistence.md](07-state-and-persistence.md) - Session state storage
- [27-npc-schedules-and-routines.md](27-npc-schedules-and-routines.md) - Background NPC behavior
- [28-affinity-and-relationship-dynamics.md](28-affinity-and-relationship-dynamics.md) - Relationship systems
- [29-time-triggered-behaviors.md](29-time-triggered-behaviors.md) - NPC time-aware responses
