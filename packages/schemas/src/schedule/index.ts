/**
 * NPC Schedule Module
 *
 * Types, schemas, utilities, and templates for NPC scheduling.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 */

// Types
export type {
  CharacterScheduleFields,
  ChoiceCondition,
  ConditionContext,
  ConditionEffect,
  ConditionType,
  NpcActivity,
  NpcScheduleData,
  NpcSchedule,
  NpcScheduleRef,
  OverrideBehavior,
  ScheduleChoice,
  ScheduleDestination,
  ScheduleOption,
  ScheduleOverride,
  ScheduleResolution,
  ScheduleSlot,
  ScheduleTemplate,
  SlotTime,
} from './types.js';

// Schemas
export {
  CharacterScheduleFieldsSchema,
  ChoiceConditionSchema,
  ConditionContextSchema,
  ConditionEffectSchema,
  ConditionTypeSchema,
  DefaultSlotSchema,
  NpcScheduleRefSchema,
  NpcScheduleSchema,
  OverrideBehaviorSchema,
  ScheduleChoiceSchema,
  ScheduleDestinationOrChoiceSchema,
  ScheduleDestinationSchema,
  ScheduleOptionSchema,
  ScheduleOverrideSchema,
  ScheduleResolutionSchema,
  ScheduleSlotSchema,
  ScheduleTemplateSchema,
  SlotTimeSchema,
} from './schemas.js';

// Utilities
export {
  calculateEffectiveWeight,
  createActivity,
  evaluateCondition,
  findActiveOverride,
  findActiveSlot,
  fixedDestination,
  gameTimeToMinutes,
  isSlotActiveOnDay,
  isTimeInSlot,
  resolveSchedule,
  resolveScheduleChoice,
  resolveScheduleTemplate,
  roll2d6,
  slotTime,
  slotTimeToMinutes,
} from './utils.js';

// Defaults & Templates
export {
  COMMON_ACTIVITIES,
  createHomeWorkSchedule,
  createSimpleSchedule,
  createSlot,
  createTemplateMap,
  DEFAULT_TEMPLATE_MAP,
  GUARD_TEMPLATE,
  NOBLE_TEMPLATE,
  SCHEDULE_TEMPLATES,
  SHOPKEEPER_TEMPLATE,
  TAVERN_KEEPER_TEMPLATE,
  WANDERER_TEMPLATE,
} from './defaults.js';
