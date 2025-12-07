import {
  TAG_CATEGORIES,
  TAG_ACTIVATION_MODES,
  TAG_TARGET_TYPES,
  TAG_VISIBILITIES,
  TAG_PRIORITIES,
  TAG_COMPOSITION_MODES,
  TAG_TRIGGER_CONDITIONS,
  type TagCategory,
  type TagActivationMode,
  type TagTargetType,
  type TagVisibility,
  type TagPriority,
  type TagCompositionMode,
  type TagTriggerCondition,
} from '@minimal-rpg/schemas';

// Re-export constants for use in components
export {
  TAG_CATEGORIES,
  TAG_ACTIVATION_MODES,
  TAG_TARGET_TYPES,
  TAG_VISIBILITIES,
  TAG_PRIORITIES,
  TAG_COMPOSITION_MODES,
  TAG_TRIGGER_CONDITIONS,
};

// Re-export types
export type {
  TagCategory,
  TagActivationMode,
  TagTargetType,
  TagVisibility,
  TagPriority,
  TagCompositionMode,
  TagTriggerCondition,
};

/**
 * Form entry for a trigger condition.
 */
export interface TriggerFormEntry {
  condition: TagTriggerCondition;
  invert: boolean;
  // Condition-specific params as simple strings for form input
  intents: string; // comma-separated
  keywords: string; // comma-separated
  emotions: string; // comma-separated
  relationshipLevels: string; // comma-separated
  timeRange: string;
  locationIds: string; // comma-separated
  locationTags: string; // comma-separated
  stateFlags: string; // comma-separated
}

/**
 * Complete tag form state.
 */
export interface TagFormState {
  id: string;
  name: string;
  shortDescription: string;
  category: TagCategory;
  promptText: string;
  activationMode: TagActivationMode;
  targetType: TagTargetType;
  triggers: TriggerFormEntry[];
  priority: TagPriority;
  compositionMode: TagCompositionMode;
  conflictsWith: string; // comma-separated tag names
  requires: string; // comma-separated tag names
  visibility: TagVisibility;
  changelog: string;
  // Read-only fields from server
  version: string;
  isBuiltIn: boolean;
}

export type FormKey = keyof TagFormState;
export type FormFieldErrors = Partial<Record<FormKey, string>>;
export type UpdateFieldFn = <K extends keyof TagFormState>(key: K, value: TagFormState[K]) => void;

/**
 * Create a new trigger entry with defaults.
 */
export const createTriggerEntry = (): TriggerFormEntry => ({
  condition: TAG_TRIGGER_CONDITIONS[0],
  invert: false,
  intents: '',
  keywords: '',
  emotions: '',
  relationshipLevels: '',
  timeRange: '',
  locationIds: '',
  locationTags: '',
  stateFlags: '',
});

/**
 * Create initial form state for a new tag.
 */
export const createInitialState = (): TagFormState => ({
  id: '',
  name: '',
  shortDescription: '',
  category: 'style',
  promptText: '',
  activationMode: 'always',
  targetType: 'session',
  triggers: [],
  priority: 'normal',
  compositionMode: 'append',
  conflictsWith: '',
  requires: '',
  visibility: 'public',
  changelog: '',
  version: '1.0.0',
  isBuiltIn: false,
});

/**
 * Human-readable labels for categories.
 */
export const CATEGORY_LABELS: Record<TagCategory, string> = {
  style: 'Narrative Style',
  mechanic: 'Game Mechanics',
  content: 'Content Preferences',
  world: 'World Rules',
  behavior: 'Behavior Modifiers',
  trigger: 'Conditional Prompts',
  meta: 'Meta/Session',
};

/**
 * Human-readable labels for activation modes.
 */
export const ACTIVATION_MODE_LABELS: Record<TagActivationMode, string> = {
  always: 'Always Active',
  conditional: 'Conditional',
};

/**
 * Human-readable labels for target types.
 */
export const TARGET_TYPE_LABELS: Record<TagTargetType, string> = {
  session: 'Entire Session',
  character: 'Specific Character',
  npc: 'NPCs Only',
  player: 'Player Only',
  location: 'Specific Location',
  setting: 'Setting/World',
};

/**
 * Human-readable labels for trigger conditions.
 */
export const TRIGGER_CONDITION_LABELS: Record<TagTriggerCondition, string> = {
  intent: 'Player Intent',
  keyword: 'Keyword Match',
  emotion: 'Emotional State',
  relationship: 'Relationship Level',
  time: 'Time Period',
  location: 'Location',
  state: 'State Flag',
};

/**
 * Descriptions for each trigger condition.
 */
export const TRIGGER_CONDITION_DESCRIPTIONS: Record<TagTriggerCondition, string> = {
  intent: 'Active when player action matches specific intents (talk, move, examine, etc.)',
  keyword: 'Active when input contains specific keywords',
  emotion: 'Active when character is in specific emotional state',
  relationship: 'Active at specific relationship levels (stranger, acquaintance, friend, etc.)',
  time: 'Active during specific time periods (morning, night, etc.)',
  location: 'Active in specific locations',
  state: 'Active when specific state flags are set',
};
