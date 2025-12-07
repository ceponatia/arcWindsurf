// Tag schema definitions
export {
  TAG_CATEGORIES,
  TAG_ACTIVATION_MODES,
  TAG_VISIBILITIES,
  TAG_TARGET_TYPES,
  TAG_TRIGGER_CONDITIONS,
  TAG_PRIORITIES,
  TAG_COMPOSITION_MODES,
  TagTriggerSchema,
  TagDefinitionSchema,
  SessionTagBindingSchema,
  SessionTagInstanceSchema,
} from './definitions.js';

export type {
  TagCategory,
  TagActivationMode,
  TagVisibility,
  TagTargetType,
  TagTriggerCondition,
  TagTrigger,
  TagPriority,
  TagCompositionMode,
  TagDefinition,
  SessionTagBinding,
  SessionTagInstance,
} from './definitions.js';

// Tag helper functions
export { isConditionalTag, incrementVersion, validateTrigger } from './helpers.js';
