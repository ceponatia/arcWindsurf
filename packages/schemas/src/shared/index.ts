/**
 * Shared schemas - common types used across character and persona schemas
 */

// Type-safe record access helpers
export {
  getRecord,
  getRecordOptional,
  getPartialRecord,
  setRecord,
  setPartialRecord,
  getArraySafe,
  getTuple,
} from './record-helpers.js';

// Core identity fields
export { GENDERS, CoreIdentitySchema, type CoreIdentity, type Gender } from './basics.js';

// Message roles and helpers
export {
  MESSAGE_ROLES,
  MessageRoleSchema,
  type MessageRole,
  type ConversationMessageRole,
  type UserAssistantMessageRole,
} from './message-types.js';

// Physical appearance/physique
export {
  APPEARANCE_HEIGHTS,
  APPEARANCE_TORSOS,
  APPEARANCE_ARMS_BUILD,
  APPEARANCE_ARMS_LENGTH,
  APPEARANCE_LEGS_LENGTH,
  APPEARANCE_FEET_SIZES,
  APPEARANCE_LEGS_BUILD,
  BuildSchema,
  AppearanceSchema,
  PhysiqueSchema,
  type AppearanceHeight,
  type AppearanceTorso,
  type AppearanceArmsBuild,
  type AppearanceArmsLength,
  type AppearanceLegsLength,
  type AppearanceFeetSize,
  type AppearanceLegsBuild,
  type Build,
  type Appearance,
  type Physique,
} from './physique.js';

// Presence tracking
export {
  type PresenceRecord,
  type PresenceScheduler,
  type PresenceSchedulerStopOnly,
} from './presence-types.js';

// Validation results
export {
  type ValidationResult,
  type ActionValidationResult,
  type ResponseValidationResult,
  type WorkspaceValidationResult,
} from './validation-types.js';

// Tool types
export {
  type ToolParameterSchema,
  type ToolDefinition,
  type ToolCall,
  type ToolResult,
} from './tool-types.js';

// Sensory types
export {
  SENSORY_INDICATOR_TYPES,
  type SensoryType,
} from './sensory-types.js';

// JSON Patch types
export {
  type JsonPatchOperationOp,
  type JsonPatchOperation,
} from './json-patch-types.js';

// Usage types
export {
  type EntityUsageType,
  type SessionUsageInfo,
  type EntityUsageSummary,
} from './usage-types.js';

// Sensory modifiers
export { type LoadedSensoryModifiers } from './sensory-modifiers-types.js';

// Cognition task payloads
export {
  CognitionTaskContextSchema,
  CognitionTaskSchema,
  type CognitionTaskContext,
  type CognitionTask,
} from './cognition-task.js';
