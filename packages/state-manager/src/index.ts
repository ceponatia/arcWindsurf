// Core exports
export {
  StateManager,
  StateValidationError,
  PatchValidationError,
  SliceNotFoundError,
  SliceRegistrationError,
} from './manager.js';

// Types
export type {
  // Core types
  JsonValue,
  JsonObject,
  DeepPartial,
  // Configuration
  StateManagerConfig,
  // Merge types
  MergeOptions,
  StateMergeResult,
  // Patch types
  Operation,
  ValidatedOperation,
  PatchOptions,
  StatePatchResult,
  FailedPatch,
  // Diff types
  DiffResult,
  // Validation types
  ValidationResult,
  ValidationError,
  // Snapshot types
  StateSnapshot,
  StateChangeMetadata,
  StateChangeSource,
  // Slice types
  MergeStrategy,
  StateSlice,
  StatePatches,
  SliceState,
  MultiSlicePatchResult,
  // Utility types
  PathsOf,
  TypeAtPath,
} from './types.js';

// Proximity Service
export {
  ProximityService,
  type ProximityUpdateResult,
  type UpdateProximityParams,
  type UpdateNpcProximityLevelParams,
} from './proximity/proximity-service.js';

// Constants
export { DEFAULT_STATE_MANAGER_CONFIG } from './types.js';

// Utilities (for advanced use cases)
export {
  deepMerge,
  deepDiff,
  deepClone,
  deepEqual,
  isPlainObject,
  isJsonValue,
  getAtPath,
  setAtPath,
  extractPathsFromPatches,
} from './utils.js';
