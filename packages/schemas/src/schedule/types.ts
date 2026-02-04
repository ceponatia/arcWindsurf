/**
 * NPC Schedule Types
 *
 * Types for defining NPC schedules, routines, and conditional behaviors.
 * Schedules determine where NPCs are and what they're doing at any given time.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 */
import type { GameTime } from '../time/types.js';
import type { NpcActivity } from '../state/npc-location.js';

// Re-export for convenience
export type { NpcActivity };

// =============================================================================
// Schedule Destination Types
// =============================================================================

/**
 * Fixed destination - NPC always goes to a specific location.
 */
export interface ScheduleDestination {
  readonly type: 'fixed';
  /** Target location ID */
  readonly locationId: string;
  /** Optional sub-location (e.g., specific table in a tavern) */
  readonly subLocationId?: string | undefined;
}

/**
 * Choice-based destination with weighted options.
 * Resolved using 2d6 roll for bell-curve distribution.
 */
export interface ScheduleChoice {
  readonly type: 'choice';
  /** Weighted options for resolution */
  readonly options: readonly ScheduleOption[];
  /** Default option if no conditions match or roll is out of range */
  readonly fallback: ScheduleDestination;
}

/**
 * Single weighted option in a schedule choice.
 */
export interface ScheduleOption {
  /** Weight 2-12 for 2d6 roll (7 most likely, 2/12 rare) */
  readonly weight: number;
  /** Where to go if selected */
  readonly destination: ScheduleDestination;
  /** Activity to perform at destination */
  readonly activity: NpcActivity;
  /** Optional conditions that modify selection */
  readonly conditions?: readonly ChoiceCondition[] | undefined;
}

// =============================================================================
// Schedule Slot Types
// =============================================================================

/**
 * Single time slot in an NPC's schedule.
 */
export interface ScheduleSlot {
  /** Unique identifier for this slot */
  readonly id: string;
  /** Start time (hours 0-23, minutes 0-59) */
  readonly startTime: SlotTime;
  /** End time (hours 0-23, minutes 0-59) */
  readonly endTime: SlotTime;
  /** Where the NPC goes during this slot */
  readonly destination: ScheduleDestination | ScheduleChoice;
  /** Default activity at destination */
  readonly activity: NpcActivity;
  /** Priority for conflict resolution (higher wins) */
  readonly priority?: number | undefined;
  /** Days this slot is active (undefined = all days) */
  readonly activeDays?: readonly number[] | undefined;
}

/**
 * Simple time representation for schedule slots.
 * Uses 24-hour format.
 */
export interface SlotTime {
  /** Hour (0-23) */
  readonly hour: number;
  /** Minute (0-59) */
  readonly minute: number;
}

// =============================================================================
// Condition Types
// =============================================================================

/**
 * Types of conditions that can affect schedule resolution.
 */
export type ConditionType =
  | 'weather'
  | 'time-of-year'
  | 'relationship'
  | 'trait'
  | 'event'
  | 'random'
  | 'player-presence'
  | 'npc-state'
  | 'inventory'
  | 'custom';

/**
 * How a condition modifies option selection.
 */
export type ConditionEffect = 'boost' | 'reduce' | 'block' | 'require';

/**
 * Condition that can modify schedule option selection.
 */
export interface ChoiceCondition {
  /** Type of condition to evaluate */
  readonly type: ConditionType;
  /** Condition-specific key (e.g., 'rain' for weather, 'friendly' for relationship) */
  readonly key: string;
  /** Expected value for condition match */
  readonly value: string | number | boolean;
  /** How this condition affects option selection */
  readonly effect: ConditionEffect;
  /** Modifier amount for boost/reduce (-5 to +5) */
  readonly modifier?: number | undefined;
}

// =============================================================================
// Override Types
// =============================================================================

/**
 * Behaviors for schedule overrides.
 */
export type OverrideBehavior =
  | 'use-schedule' // Use referenced schedule instead
  | 'stay-put' // Stay at current location
  | 'go-to' // Go to specific location
  | 'follow-npc' // Follow another NPC
  | 'unavailable'; // NPC is unavailable (e.g., traveling)

/**
 * Temporary override that supersedes normal schedule.
 */
export interface ScheduleOverride {
  /** Unique identifier */
  readonly id: string;
  /** What triggers this override */
  readonly condition: ChoiceCondition;
  /** How to handle the override */
  readonly behavior: OverrideBehavior;
  /** Target for behavior (location ID, NPC ID, or schedule ID) */
  readonly target?: string | undefined;
  /** Activity during override */
  readonly activity?: NpcActivity | undefined;
  /** When override expires (undefined = permanent until condition fails) */
  readonly expiresAt?: GameTime | undefined;
  /** Priority for override conflict resolution */
  readonly priority?: number | undefined;
}

// =============================================================================
// Complete Schedule Types
// =============================================================================

/**
 * Complete NPC schedule definition.
 */
export interface NpcSchedule {
  /** Unique identifier for this schedule */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Optional description */
  readonly description?: string | undefined;
  /** Ordered time slots (checked in order) */
  readonly slots: readonly ScheduleSlot[];
  /** Default slot if no time slot matches */
  readonly defaultSlot: Omit<ScheduleSlot, 'id' | 'startTime' | 'endTime'>;
  /** Override conditions that supersede normal schedule */
  readonly overrides?: readonly ScheduleOverride[] | undefined;
  /** Optional template ID this schedule is based on */
  readonly templateId?: string | undefined;
}

// =============================================================================
// Template Types
// =============================================================================

/**
 * Reusable schedule template with placeholder resolution.
 */
export interface ScheduleTemplate {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable name (e.g., 'Shopkeeper', 'Guard') */
  readonly name: string;
  /** Description of typical use case */
  readonly description?: string | undefined;
  /** Template slots with placeholder location IDs */
  readonly slots: readonly ScheduleSlot[];
  /** Default slot template */
  readonly defaultSlot: Omit<ScheduleSlot, 'id' | 'startTime' | 'endTime'>;
  /** Placeholder keys that must be provided (e.g., 'workLocation', 'homeLocation') */
  readonly requiredPlaceholders: readonly string[];
  /** Optional default overrides */
  readonly defaultOverrides?: readonly ScheduleOverride[] | undefined;
}

/**
 * Reference to a schedule template with placeholder values.
 */
export interface NpcScheduleRef {
  /** Template ID to use */
  readonly templateId: string;
  /** Map of placeholder key to actual location ID */
  readonly placeholders: Readonly<Record<string, string>>;
  /** Additional overrides specific to this NPC */
  readonly additionalOverrides?: readonly ScheduleOverride[] | undefined;
}

// =============================================================================
// Character Integration Types
// =============================================================================

/**
 * Schedule-related fields for character profiles.
 */
export interface CharacterScheduleFields {
  /** Direct schedule definition */
  readonly schedule?: NpcSchedule | undefined;
  /** Reference to schedule template */
  readonly scheduleRef?: NpcScheduleRef | undefined;
  /** Home location ID (default rest location) */
  readonly homeLocationId?: string | undefined;
  /** Work location ID (primary daytime location) */
  readonly workLocationId?: string | undefined;
}

// =============================================================================
// Schedule Resolution Inputs
// =============================================================================

/**
 * NPC schedule data for resolution.
 */
export interface NpcScheduleData {
  /** NPC identifier */
  readonly npcId: string;
  /** Direct schedule definition (if provided) */
  readonly schedule?: NpcSchedule | undefined;
  /** Schedule template reference (if using templates) */
  readonly scheduleRef?: NpcScheduleRef | undefined;
  /** Home location fallback */
  readonly homeLocationId?: string | undefined;
  /** Work location fallback */
  readonly workLocationId?: string | undefined;
}

// =============================================================================
// Resolution Types
// =============================================================================

/**
 * Result of resolving a schedule at a specific time.
 */
export interface ScheduleResolution {
  /** Resolved location ID */
  readonly locationId: string;
  /** Optional sub-location */
  readonly subLocationId?: string | undefined;
  /** Activity at location */
  readonly activity: NpcActivity;
  /** Which slot was matched (undefined if default) */
  readonly matchedSlotId?: string | undefined;
  /** Active override if any */
  readonly activeOverride?: ScheduleOverride | undefined;
  /** Whether choice resolution was used */
  readonly usedChoice: boolean;
  /** Roll value if choice was used (2-12) */
  readonly rollValue?: number | undefined;
}

/**
 * Context for condition evaluation.
 */
export interface ConditionContext {
  /** Current game time */
  readonly currentTime: GameTime;
  /** Current weather (if applicable) */
  readonly weather?: string | undefined;
  /** Player's current location */
  readonly playerLocationId?: string | undefined;
  /** NPC's relationship level with player (0-100) */
  readonly relationshipLevel?: number | undefined;
  /** NPC's current state flags */
  readonly npcState?: Readonly<Record<string, unknown>> | undefined;
  /** NPC's inventory items */
  readonly inventory?: readonly string[] | undefined;
  /** Active events */
  readonly activeEvents?: readonly string[] | undefined;
  /** Custom condition values */
  readonly custom?: Readonly<Record<string, unknown>> | undefined;
}
