/**
 * Sessions Module
 *
 * Exports all session-related services including:
 * - State cache (in-memory session-only state)
 * - State loader (load state at turn start)
 * - State persister (persist state at turn end)
 * - Instance management (character/setting overrides)
 * - Schedule service (NPC schedule resolution)
 * - Simulation service (NPC simulation)
 * - Simulation hooks (turn/period/location change hooks)
 * - Tier service (player interest and NPC promotion)
 * - Encounter service (NPC encounter narration)
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

// Schedule Service
export {
  resolveNpcScheduleAtTime,
  resolveNpcSchedulesBatch,
  checkNpcAvailability,
  getNpcsAtLocationBySchedule,
  type NpcScheduleData,
  type ScheduleResolutionOptions,
  type ScheduleResolutionResult,
} from './schedule-service.js';

// Simulation Service
export {
  runSimulationTick,
  runTimeSkipSimulation,
  getNpcsNeedingSimulation,
  buildSimulationPriorities,
  type SimulationNpcInfo,
  type SimulationTickOptions,
  type SimulationServiceResult,
} from './simulation-service.js';

// Simulation Hooks
export {
  onTurnComplete,
  onPeriodChange,
  onLocationChange,
  onTimeSkip,
  type HookNpcInfo,
  type TurnHookInput,
  type TurnHookResult,
  type PeriodChangeHookInput,
  type PeriodChangeHookResult,
  type LocationChangeHookInput,
  type LocationChangeHookResult,
  type TimeSkipHookInput,
  type TimeSkipHookResult,
} from './simulation-hooks.js';

// Tier Service
export {
  getInterestScore,
  getAllInterestScores,
  processTurnInterest,
  executePromotion,
  getNpcsReadyForPromotion,
  type TurnInterestResult,
  type ProcessInterestOptions,
} from './tier-service.js';

// Encounter Service
export {
  generateEncounterNarration,
  generateNpcEntranceNarration,
  generateNpcExitNarration,
  type EncounterNpcInfo,
  type EncounterNarration,
  type EncounterNarrationOptions,
} from './encounter-service.js';

// Utilities (re-export for backward compatibility)
export { deepMergeReplaceArrays } from '../util/object.js';
