// Core exports
export { StateManager, StateValidationError, PatchValidationError } from './manager.js';

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
  // Utility types
  PathsOf,
  TypeAtPath,
} from './types.js';

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
