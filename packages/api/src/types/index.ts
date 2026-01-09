/**
 * API Type Definitions
 *
 * Re-exports all type definitions for easy importing.
 */

// Actor state types
export type {
  NpcActorState,
  PlayerActorState,
  ActorState,
  AffinityRecord,
} from './actor-state.js';

export {
  isNpcState,
  isPlayerState,
  asActorState,
  asNpcState,
  asPlayerState,
} from './actor-state.js';

// Database row types
export type {
  LocationMapRow,
  LocationPrefabRow,
  ScheduleTemplateRow,
  EntityProfileRow,
  ActorStateRow,
} from './db-rows.js';
