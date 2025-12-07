// Core Governor
export { Governor, createGovernor } from './core/governor.js';

// Intent Types and Aliases
export {
  INTENT_CONFIG,
  INTENT_TYPES,
  INTENT_ALIASES,
  INTENT_TO_AGENT_MAP,
  getIntentTypeList,
  isValidIntentType,
  resolveIntentType,
  mapToAgentIntent,
} from './intents/intents.js';

// Intent Detection
export {
  RuleBasedIntentDetector,
  createRuleBasedIntentDetector,
  createFallbackIntentDetector,
  type RuleBasedIntentDetectorConfig,
} from './intents/intent-detector.js';
export {
  LlmIntentDetector,
  type LlmIntentDetectorConfig,
  type LlmIntentMessage,
  type LlmIntentGenerateFn,
  type LlmIntentGenerationResult,
} from './intents/llm-intent-detector.js';

// Equipment Slot Resolution (bridges body regions to item slots)
export {
  BODY_REGION_TO_EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_TO_BODY_REGIONS,
  getEquipmentSlotsForRegion,
  getBodyRegionsForSlot,
  doesSlotCoverRegion,
  resolveBodyWithEquipment,
  type EquipmentSlot,
  type BodyEquipmentResolution,
} from './utils/equipment-resolver.js';

// Context Building
export {
  DefaultContextBuilder,
  createContextBuilder,
  type ContextBuilderConfig,
} from './core/context-builder.js';

// Types
export * from './types.js';
