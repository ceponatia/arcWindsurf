/**
 * NPC Schedule Schemas
 *
 * Zod validation schemas for NPC schedules and routines.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 */
import { z } from 'zod';
import { GameTimeSchema } from '../time/schemas.js';
import { NpcActivitySchema } from '../state/npc-location.js';

// =============================================================================
// Time Schemas
// =============================================================================

/**
 * Simple time representation for schedule slots.
 */
export const SlotTimeSchema = z.object({
  /** Hour (0-23) */
  hour: z.number().int().min(0).max(23),
  /** Minute (0-59) */
  minute: z.number().int().min(0).max(59),
});

// =============================================================================
// Destination Schemas
// =============================================================================

/**
 * Fixed destination - NPC always goes to a specific location.
 */
export const ScheduleDestinationSchema = z.object({
  type: z.literal('fixed'),
  /** Target location ID */
  locationId: z.string().min(1),
  /** Optional sub-location */
  subLocationId: z.string().optional(),
});

// =============================================================================
// Condition Schemas
// =============================================================================

/**
 * Types of conditions that can affect schedule resolution.
 */
export const ConditionTypeSchema = z.enum([
  'weather',
  'time-of-year',
  'relationship',
  'trait',
  'event',
  'random',
  'player-presence',
  'npc-state',
  'inventory',
  'custom',
]);

/**
 * How a condition modifies option selection.
 */
export const ConditionEffectSchema = z.enum(['boost', 'reduce', 'block', 'require']);

/**
 * Condition that can modify schedule option selection.
 */
export const ChoiceConditionSchema = z.object({
  /** Type of condition to evaluate */
  type: ConditionTypeSchema,
  /** Condition-specific key */
  key: z.string().min(1),
  /** Expected value for condition match */
  value: z.union([z.string(), z.number(), z.boolean()]),
  /** How this condition affects option selection */
  effect: ConditionEffectSchema,
  /** Modifier amount for boost/reduce (-5 to +5) */
  modifier: z.number().int().min(-5).max(5).optional(),
});

// =============================================================================
// Schedule Option Schemas
// =============================================================================

/**
 * Single weighted option in a schedule choice.
 */
export const ScheduleOptionSchema = z.object({
  /** Weight 2-12 for 2d6 roll */
  weight: z.number().int().min(2).max(12),
  /** Where to go if selected */
  destination: ScheduleDestinationSchema,
  /** Activity to perform at destination */
  activity: NpcActivitySchema,
  /** Optional conditions that modify selection */
  conditions: z.array(ChoiceConditionSchema).optional(),
});

/**
 * Choice-based destination with weighted options.
 */
export const ScheduleChoiceSchema = z.object({
  type: z.literal('choice'),
  /** Weighted options for resolution */
  options: z.array(ScheduleOptionSchema).min(1),
  /** Default option if no conditions match */
  fallback: ScheduleDestinationSchema,
});

/**
 * Destination can be fixed or choice-based.
 */
export const ScheduleDestinationOrChoiceSchema = z.discriminatedUnion('type', [
  ScheduleDestinationSchema,
  ScheduleChoiceSchema,
]);

// =============================================================================
// Schedule Slot Schemas
// =============================================================================

/**
 * Single time slot in an NPC's schedule.
 */
export const ScheduleSlotSchema = z.object({
  /** Unique identifier for this slot */
  id: z.string().min(1),
  /** Start time */
  startTime: SlotTimeSchema,
  /** End time */
  endTime: SlotTimeSchema,
  /** Where the NPC goes during this slot */
  destination: ScheduleDestinationOrChoiceSchema,
  /** Default activity at destination */
  activity: NpcActivitySchema,
  /** Priority for conflict resolution */
  priority: z.number().int().min(0).optional(),
  /** Days this slot is active (0-6, 0 = first day of week) */
  activeDays: z.array(z.number().int().min(0).max(6)).optional(),
});

/**
 * Default slot definition (no time bounds).
 */
export const DefaultSlotSchema = z.object({
  /** Where the NPC goes by default */
  destination: ScheduleDestinationOrChoiceSchema,
  /** Default activity */
  activity: NpcActivitySchema,
  /** Priority for conflict resolution */
  priority: z.number().int().min(0).optional(),
});

// =============================================================================
// Override Schemas
// =============================================================================

/**
 * Behaviors for schedule overrides.
 */
export const OverrideBehaviorSchema = z.enum([
  'use-schedule',
  'stay-put',
  'go-to',
  'follow-npc',
  'unavailable',
]);

/**
 * Temporary override that supersedes normal schedule.
 */
export const ScheduleOverrideSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** What triggers this override */
  condition: ChoiceConditionSchema,
  /** How to handle the override */
  behavior: OverrideBehaviorSchema,
  /** Target for behavior */
  target: z.string().optional(),
  /** Activity during override */
  activity: NpcActivitySchema.optional(),
  /** When override expires */
  expiresAt: GameTimeSchema.optional(),
  /** Priority for override conflict resolution */
  priority: z.number().int().min(0).optional(),
});

// =============================================================================
// Complete Schedule Schemas
// =============================================================================

/**
 * Complete NPC schedule definition.
 */
export const NpcScheduleSchema = z.object({
  /** Unique identifier for this schedule */
  id: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Optional description */
  description: z.string().optional(),
  /** Ordered time slots */
  slots: z.array(ScheduleSlotSchema),
  /** Default slot if no time slot matches */
  defaultSlot: DefaultSlotSchema,
  /** Override conditions */
  overrides: z.array(ScheduleOverrideSchema).optional(),
  /** Optional template ID this schedule is based on */
  templateId: z.string().optional(),
});

// =============================================================================
// Template Schemas
// =============================================================================

/**
 * Reusable schedule template.
 */
export const ScheduleTemplateSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Description of typical use case */
  description: z.string().optional(),
  /** Template slots with placeholder location IDs */
  slots: z.array(ScheduleSlotSchema),
  /** Default slot template */
  defaultSlot: DefaultSlotSchema,
  /** Placeholder keys that must be provided */
  requiredPlaceholders: z.array(z.string().min(1)),
  /** Optional default overrides */
  defaultOverrides: z.array(ScheduleOverrideSchema).optional(),
});

/**
 * Reference to a schedule template with placeholder values.
 */
export const NpcScheduleRefSchema = z.object({
  /** Template ID to use */
  templateId: z.string().min(1),
  /** Map of placeholder key to actual location ID */
  placeholders: z.record(z.string(), z.string().min(1)),
  /** Additional overrides specific to this NPC */
  additionalOverrides: z.array(ScheduleOverrideSchema).optional(),
});

// =============================================================================
// Character Integration Schemas
// =============================================================================

/**
 * Schedule-related fields for character profiles.
 */
export const CharacterScheduleFieldsSchema = z.object({
  /** Direct schedule definition */
  schedule: NpcScheduleSchema.optional(),
  /** Reference to schedule template */
  scheduleRef: NpcScheduleRefSchema.optional(),
  /** Home location ID */
  homeLocationId: z.string().optional(),
  /** Work location ID */
  workLocationId: z.string().optional(),
});

// =============================================================================
// Resolution Schemas
// =============================================================================

/**
 * Result of resolving a schedule at a specific time.
 */
export const ScheduleResolutionSchema = z.object({
  /** Resolved location ID */
  locationId: z.string().min(1),
  /** Optional sub-location */
  subLocationId: z.string().optional(),
  /** Activity at location */
  activity: NpcActivitySchema,
  /** Which slot was matched */
  matchedSlotId: z.string().optional(),
  /** Active override if any */
  activeOverride: ScheduleOverrideSchema.optional(),
  /** Whether choice resolution was used */
  usedChoice: z.boolean(),
  /** Roll value if choice was used (2-12) */
  rollValue: z.number().int().min(2).max(12).optional(),
});

/**
 * Context for condition evaluation.
 */
export const ConditionContextSchema = z.object({
  /** Current game time */
  currentTime: GameTimeSchema,
  /** Current weather */
  weather: z.string().optional(),
  /** Player's current location */
  playerLocationId: z.string().optional(),
  /** NPC's relationship level with player (0-100) */
  relationshipLevel: z.number().min(0).max(100).optional(),
  /** NPC's current state flags */
  npcState: z.record(z.string(), z.unknown()).optional(),
  /** NPC's inventory items */
  inventory: z.array(z.string()).optional(),
  /** Active events */
  activeEvents: z.array(z.string()).optional(),
  /** Custom condition values */
  custom: z.record(z.string(), z.unknown()).optional(),
});
