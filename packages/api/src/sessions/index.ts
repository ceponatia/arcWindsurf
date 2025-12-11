/**
 * Sessions Module
 *
 * Exports all session-related services including:
 * - State cache (in-memory session-only state)
 * - State loader (load state at turn start)
 * - State persister (persist state at turn end)
 * - Instance management (character/setting overrides)
 */

// Session State Cache
export {
  SessionStateCache,
  sessionStateCache,
  type SessionCacheEntry,
  type DialogueState,
  type CacheOptions,
} from './state-cache.js';

// State Loader
export {
  loadStateForTurn,
  getProximityState,
  getDialogueState,
  StateLoadError,
  type LoadedTurnState,
  type LoadStateOptions,
} from './state-loader.js';

// State Persister
export {
  persistTurnState,
  persistSessionState,
  clearSessionState,
  type PersistStateOptions,
  type PersistSessionStateOptions,
  type PersistStateResult,
} from './state-persister.js';

// Instance Management (legacy, still used by override endpoints)
export {
  upsertCharacterOverrides,
  upsertSettingOverrides,
  getEffectiveCharacter,
  getEffectiveSetting,
  getEffectiveProfiles,
} from './instances.js';

// Utilities (re-export for backward compatibility)
export { deepMergeReplaceArrays } from '../util/object.js';
