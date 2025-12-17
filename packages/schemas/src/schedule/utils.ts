/**
 * NPC Schedule Utilities
 *
 * Functions for resolving schedules, evaluating conditions, and
 * choosing options using the 2d6 bell-curve system.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 */
import type { GameTime } from '../time/types.js';
import type { NpcActivity } from '../state/npc-location.js';
import type {
  ChoiceCondition,
  ConditionContext,
  NpcSchedule,
  NpcScheduleRef,
  ScheduleChoice,
  ScheduleDestination,
  ScheduleOption,
  ScheduleOverride,
  ScheduleResolution,
  ScheduleSlot,
  ScheduleTemplate,
  SlotTime,
} from './types.js';

// =============================================================================
// Random Number Generation
// =============================================================================

/**
 * Rolls 2d6 and returns the sum (2-12).
 * Uses a provided RNG function for determinism in tests.
 *
 * @param rng - Random number generator (0-1), defaults to Math.random
 * @returns Sum of two d6 rolls (2-12)
 */
export function roll2d6(rng: () => number = Math.random): number {
  const d1 = Math.floor(rng() * 6) + 1;
  const d2 = Math.floor(rng() * 6) + 1;
  return d1 + d2;
}

// =============================================================================
// Time Utilities
// =============================================================================

/**
 * Converts SlotTime to minutes since midnight for comparison.
 *
 * @param time - Slot time to convert
 * @returns Minutes since midnight (0-1439)
 */
export function slotTimeToMinutes(time: SlotTime): number {
  return time.hour * 60 + time.minute;
}

/**
 * Converts GameTime to minutes since midnight for slot matching.
 *
 * @param time - Game time to convert
 * @returns Minutes since midnight (0-1439)
 */
export function gameTimeToMinutes(time: GameTime): number {
  return time.hour * 60 + time.minute;
}

/**
 * Checks if a game time falls within a slot's time range.
 * Handles overnight slots (e.g., 22:00 - 06:00).
 *
 * @param time - Current game time
 * @param start - Slot start time
 * @param end - Slot end time
 * @returns True if time is within the slot
 */
export function isTimeInSlot(time: GameTime, start: SlotTime, end: SlotTime): boolean {
  const current = gameTimeToMinutes(time);
  const startMinutes = slotTimeToMinutes(start);
  const endMinutes = slotTimeToMinutes(end);

  // Handle overnight slots (end < start)
  if (endMinutes < startMinutes) {
    return current >= startMinutes || current < endMinutes;
  }

  return current >= startMinutes && current < endMinutes;
}

/**
 * Checks if a slot is active on a given day.
 *
 * @param slot - Schedule slot to check
 * @param day - Day number (0-6)
 * @returns True if slot is active on the given day
 */
export function isSlotActiveOnDay(slot: ScheduleSlot, day: number): boolean {
  // If no activeDays specified, slot is active every day
  if (!slot.activeDays || slot.activeDays.length === 0) {
    return true;
  }
  return slot.activeDays.includes(day);
}

// =============================================================================
// Condition Evaluation
// =============================================================================

/**
 * Evaluates a single condition against context.
 *
 * @param condition - Condition to evaluate
 * @param context - Context with current state
 * @returns True if condition is met
 */
export function evaluateCondition(condition: ChoiceCondition, context: ConditionContext): boolean {
  switch (condition.type) {
    case 'weather':
      return context.weather === condition.value;

    case 'time-of-year': {
      // key could be 'season', 'month', etc.
      if (condition.key === 'season') {
        // Simple season calculation (assuming 4 seasons, 3 months each)
        const month = context.currentTime.month % 12;
        const seasons = [
          'winter',
          'winter',
          'spring',
          'spring',
          'spring',
          'summer',
          'summer',
          'summer',
          'fall',
          'fall',
          'fall',
          'winter',
        ];
        return seasons[month] === condition.value;
      }
      if (condition.key === 'month') {
        return context.currentTime.month === condition.value;
      }
      return false;
    }

    case 'relationship':
      if (!context.relationshipLevel) return false;
      if (condition.key === 'level') {
        // Compare relationship level
        if (typeof condition.value === 'number') {
          return context.relationshipLevel >= condition.value;
        }
        // Named thresholds
        const thresholds: Record<string, number> = {
          hostile: 0,
          unfriendly: 20,
          neutral: 40,
          friendly: 60,
          close: 80,
          intimate: 90,
        };
        const threshold = thresholds[String(condition.value)] ?? 50;
        return context.relationshipLevel >= threshold;
      }
      return false;

    case 'player-presence':
      if (condition.key === 'same-location') {
        return Boolean(context.playerLocationId);
      }
      return false;

    case 'npc-state':
      if (!context.npcState) return false;
      return context.npcState[condition.key] === condition.value;

    case 'inventory':
      if (!context.inventory) return false;
      return context.inventory.includes(String(condition.value));

    case 'event':
      if (!context.activeEvents) return false;
      return context.activeEvents.includes(String(condition.value));

    case 'random': {
      // Random chance (value is probability 0-1)
      const probability = typeof condition.value === 'number' ? condition.value : 0.5;
      return Math.random() < probability;
    }

    case 'custom':
      if (!context.custom) return false;
      return context.custom[condition.key] === condition.value;

    case 'trait': // Trait conditions require NPC trait data in context
    // For now, check npcState for traits
    {
      if (!context.npcState) return false;
      const traits = context.npcState['traits'] as string[] | undefined;
      if (!traits) return false;
      return traits.includes(String(condition.value));
    }

    default:
      return false;
  }
}

/**
 * Calculates the effective weight of an option after applying conditions.
 *
 * @param option - Schedule option with conditions
 * @param context - Context for condition evaluation
 * @returns Adjusted weight (0 if blocked, -1 if required but not met)
 */
export function calculateEffectiveWeight(
  option: ScheduleOption,
  context: ConditionContext
): number {
  if (!option.conditions || option.conditions.length === 0) {
    return option.weight;
  }

  let weight = option.weight;

  for (const condition of option.conditions) {
    const met = evaluateCondition(condition, context);

    switch (condition.effect) {
      case 'block':
        if (met) return 0; // Blocked entirely
        break;

      case 'require':
        if (!met) return -1; // Required condition not met
        break;

      case 'boost':
        if (met) {
          weight = Math.min(12, weight + (condition.modifier ?? 1));
        }
        break;

      case 'reduce':
        if (met) {
          weight = Math.max(2, weight - (condition.modifier ?? 1));
        }
        break;
    }
  }

  return weight;
}

// =============================================================================
// Choice Resolution
// =============================================================================

/**
 * Resolves a schedule choice using 2d6 roll.
 * Options are selected based on closest weight match.
 *
 * @param choice - Choice with weighted options
 * @param context - Context for condition evaluation
 * @param rng - Random number generator (for testing)
 * @returns Selected option and roll value
 */
export function resolveScheduleChoice(
  choice: ScheduleChoice,
  context: ConditionContext,
  rng: () => number = Math.random
): { option: ScheduleOption | null; rollValue: number } {
  const rollValue = roll2d6(rng);

  // Calculate effective weights for all options
  const weightedOptions: { option: ScheduleOption; weight: number }[] = [];

  for (const option of choice.options) {
    const weight = calculateEffectiveWeight(option, context);
    if (weight > 0) {
      // Skip blocked (0) and required-not-met (-1)
      weightedOptions.push({ option, weight });
    }
  }

  if (weightedOptions.length === 0) {
    return { option: null, rollValue };
  }

  // Find closest match to roll
  let closest = weightedOptions[0]!;
  let closestDiff = Math.abs(rollValue - closest.weight);

  for (const wo of weightedOptions) {
    const diff = Math.abs(rollValue - wo.weight);
    if (diff < closestDiff) {
      closest = wo;
      closestDiff = diff;
    }
  }

  return { option: closest.option, rollValue };
}

// =============================================================================
// Slot Resolution
// =============================================================================

/**
 * Finds the active slot for a given time.
 *
 * @param schedule - NPC schedule to search
 * @param time - Current game time
 * @returns Matching slot or undefined
 */
export function findActiveSlot(schedule: NpcSchedule, time: GameTime): ScheduleSlot | undefined {
  // Get day of week (assuming absoluteDay 1 = day 0 of week for simplicity)
  const dayOfWeek = (time.absoluteDay - 1) % 7;

  // Sort by priority (higher first) then by start time
  const sortedSlots = [...schedule.slots].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return slotTimeToMinutes(a.startTime) - slotTimeToMinutes(b.startTime);
  });

  for (const slot of sortedSlots) {
    if (!isSlotActiveOnDay(slot, dayOfWeek)) {
      continue;
    }

    if (isTimeInSlot(time, slot.startTime, slot.endTime)) {
      return slot;
    }
  }

  return undefined;
}

/**
 * Finds the highest-priority active override.
 *
 * @param schedule - NPC schedule with overrides
 * @param context - Context for condition evaluation
 * @returns Active override or undefined
 */
export function findActiveOverride(
  schedule: NpcSchedule,
  context: ConditionContext
): ScheduleOverride | undefined {
  if (!schedule.overrides || schedule.overrides.length === 0) {
    return undefined;
  }

  // Sort by priority (higher first)
  const sortedOverrides = [...schedule.overrides].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  for (const override of sortedOverrides) {
    // Check expiration
    if (override.expiresAt) {
      const expireMinutes =
        override.expiresAt.absoluteDay * 24 * 60 +
        override.expiresAt.hour * 60 +
        override.expiresAt.minute;
      const currentMinutes =
        context.currentTime.absoluteDay * 24 * 60 +
        context.currentTime.hour * 60 +
        context.currentTime.minute;

      if (currentMinutes >= expireMinutes) {
        continue;
      }
    }

    // Evaluate condition
    if (evaluateCondition(override.condition, context)) {
      return override;
    }
  }

  return undefined;
}

// =============================================================================
// Full Schedule Resolution
// =============================================================================

/**
 * Resolves a schedule to a concrete location and activity.
 *
 * @param schedule - NPC schedule to resolve
 * @param context - Context for condition evaluation
 * @param rng - Random number generator (for testing)
 * @returns Resolution with location, activity, and metadata
 */
export function resolveSchedule(
  schedule: NpcSchedule,
  context: ConditionContext,
  rng: () => number = Math.random
): ScheduleResolution {
  // Check for active overrides first
  const activeOverride = findActiveOverride(schedule, context);

  if (activeOverride) {
    // Handle override behaviors
    switch (activeOverride.behavior) {
      case 'go-to':
        if (activeOverride.target && activeOverride.activity) {
          return {
            locationId: activeOverride.target,
            activity: activeOverride.activity,
            activeOverride,
            usedChoice: false,
          };
        }
        break;

      case 'unavailable':
        return {
          locationId: 'unavailable',
          activity: activeOverride.activity ?? {
            type: 'unavailable',
            description: 'NPC is unavailable',
            engagement: 'absorbed',
          },
          activeOverride,
          usedChoice: false,
        };

      case 'stay-put':
        // Would need current location from context
        // Fall through to normal resolution for now
        break;

      case 'follow-npc':
      case 'use-schedule':
        // These require additional context/lookup
        // Fall through to normal resolution for now
        break;
    }
  }

  // Find matching slot
  const slot = findActiveSlot(schedule, context.currentTime);
  const targetSlot = slot ?? schedule.defaultSlot;
  const destination = targetSlot.destination;

  // Resolve destination
  if (destination.type === 'fixed') {
    return {
      locationId: destination.locationId,
      subLocationId: destination.subLocationId,
      activity: targetSlot.activity,
      matchedSlotId: slot?.id,
      activeOverride,
      usedChoice: false,
    };
  }

  // Resolve choice
  const { option, rollValue } = resolveScheduleChoice(destination, context, rng);

  if (option) {
    return {
      locationId: option.destination.locationId,
      subLocationId: option.destination.subLocationId,
      activity: option.activity,
      matchedSlotId: slot?.id,
      activeOverride,
      usedChoice: true,
      rollValue,
    };
  }

  // Fallback to choice's fallback destination
  return {
    locationId: destination.fallback.locationId,
    subLocationId: destination.fallback.subLocationId,
    activity: targetSlot.activity,
    matchedSlotId: slot?.id,
    activeOverride,
    usedChoice: true,
    rollValue,
  };
}

// =============================================================================
// Template Resolution
// =============================================================================

/**
 * Resolves a schedule template reference to a concrete schedule.
 *
 * @param ref - Reference with placeholder values
 * @param templates - Map of template ID to template
 * @returns Resolved schedule or null if template not found
 */
export function resolveScheduleTemplate(
  ref: NpcScheduleRef,
  templates: Map<string, ScheduleTemplate>
): NpcSchedule | null {
  const template = templates.get(ref.templateId);
  if (!template) {
    return null;
  }

  // Verify all required placeholders are provided
  for (const placeholder of template.requiredPlaceholders) {
    if (!(placeholder in ref.placeholders)) {
      console.warn(`Missing required placeholder: ${placeholder}`);
      return null;
    }
  }

  // Replace placeholders in slots
  const resolvedSlots = template.slots.map((slot) => ({
    ...slot,
    destination: resolveDestinationPlaceholders(slot.destination, ref.placeholders),
  }));

  // Replace placeholders in default slot
  const resolvedDefault = {
    ...template.defaultSlot,
    destination: resolveDestinationPlaceholders(template.defaultSlot.destination, ref.placeholders),
  };

  // Combine overrides
  const overrides = [...(template.defaultOverrides ?? []), ...(ref.additionalOverrides ?? [])];

  return {
    id: `${ref.templateId}-${Object.values(ref.placeholders).join('-')}`,
    name: `${template.name} (resolved)`,
    description: template.description,
    slots: resolvedSlots,
    defaultSlot: resolvedDefault,
    overrides: overrides.length > 0 ? overrides : undefined,
    templateId: ref.templateId,
  };
}

/**
 * Resolves placeholder location IDs in a destination.
 */
function resolveDestinationPlaceholders(
  destination:
    | ScheduleDestination
    | { type: 'choice'; options: readonly ScheduleOption[]; fallback: ScheduleDestination },
  placeholders: Readonly<Record<string, string>>
):
  | ScheduleDestination
  | { type: 'choice'; options: ScheduleOption[]; fallback: ScheduleDestination } {
  if (destination.type === 'fixed') {
    const locationId = destination.locationId.startsWith('$')
      ? (placeholders[destination.locationId.slice(1)] ?? destination.locationId)
      : destination.locationId;

    return {
      ...destination,
      locationId,
    };
  }

  // Choice destination
  const resolvedOptions = destination.options.map((option) => ({
    ...option,
    destination: resolveDestinationPlaceholders(
      option.destination,
      placeholders
    ) as ScheduleDestination,
  }));

  const resolvedFallback = resolveDestinationPlaceholders(
    destination.fallback,
    placeholders
  ) as ScheduleDestination;

  return {
    type: 'choice',
    options: resolvedOptions,
    fallback: resolvedFallback,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Creates a simple fixed destination.
 */
export function fixedDestination(locationId: string, subLocationId?: string): ScheduleDestination {
  return {
    type: 'fixed',
    locationId,
    subLocationId,
  };
}

/**
 * Creates a simple activity.
 */
export function createActivity(
  type: string,
  description: string,
  engagement: 'idle' | 'casual' | 'focused' | 'absorbed' = 'casual'
): NpcActivity {
  return { type, description, engagement };
}

/**
 * Creates a slot time from hours and minutes.
 */
export function slotTime(hour: number, minute = 0): SlotTime {
  return { hour, minute };
}
