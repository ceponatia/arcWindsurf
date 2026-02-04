/**
 * Time Service Types
 *
 * Shared types for schedule resolution and time services.
 */
import type {
  GameTime,
  ScheduleResolution,
  ConditionContext,
  NpcLocationState,
  NpcScheduleData,
} from '@minimal-rpg/schemas';

export type { NpcScheduleData };

/**
 * Result of resolving schedules for multiple NPCs.
 */
export interface ScheduleResolutionResult {
  /** Resolved location states for each NPC */
  locationStates: Map<string, NpcLocationState>;
  /** Resolutions with details for each NPC */
  resolutions: Map<string, ScheduleResolution>;
  /** NPCs that couldn't be resolved (missing schedule/template) */
  unresolved: string[];
}

/**
 * Options for schedule resolution.
 */
export interface ScheduleResolutionOptions {
  /** Current game time */
  currentTime: GameTime;
  /** Condition context for evaluating schedule conditions */
  conditionContext?: Partial<ConditionContext>;
  /** Custom template map (defaults to DEFAULT_TEMPLATE_MAP) */
  templateMap?: Map<string, unknown>;
}
