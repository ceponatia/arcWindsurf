/**
 * Simulation Hooks
 *
 * Integrates the simulation system with turn processing.
 * Migrated from packages/api/src/services/simulation-hooks.ts
 */
import type {
  GameTime,
  NpcLocationState,
  TieredSimulationConfig,
  TimeSkipSimulation,
  DayPeriod,
  LocationOccupancy,
  NpcTier as NpcTierNS,
} from '@minimal-rpg/schemas';

/** NPC tier type (aliased to avoid namespace collision) */
type NpcTier = NpcTierNS.NpcTier;

/**
 * NPC info for hooks.
 */
export interface HookNpcInfo {
  npcId: string;
  tier: NpcTier;
  scheduleData: any; // Placeholder for NpcScheduleData
  lastInteractionTurn?: number | undefined;
  distanceFromPlayer?: number | undefined;
}

/**
 * Turn hook input.
 */
export interface TurnHookInput {
  ownerEmail: string;
  sessionId: string;
  currentTime: GameTime;
  playerLocationId: string;
  currentTurn: number;
  npcs: HookNpcInfo[];
  config?: TieredSimulationConfig;
}

/**
 * Turn hook result.
 */
export interface TurnHookResult {
  simulatedNpcs: string[];
  locationStates: Map<string, NpcLocationState>;
  npcsAtPlayerLocation: string[];
  npcEnteredLocation: boolean;
  npcLeftLocation: boolean;
}

/**
 * Period change hook input.
 */
export interface PeriodChangeHookInput {
  ownerEmail: string;
  sessionId: string;
  currentTime: GameTime;
  previousPeriod: DayPeriod;
  newPeriod: DayPeriod;
  playerLocationId: string;
  npcs: HookNpcInfo[];
  config?: TieredSimulationConfig;
}

/**
 * Period change hook result.
 */
export interface PeriodChangeHookResult {
  simulatedNpcs: string[];
  locationStates: Map<string, NpcLocationState>;
  locationOccupancyChanged: boolean;
}

/**
 * Location change hook input.
 */
export interface LocationChangeHookInput {
  ownerEmail: string;
  sessionId: string;
  currentTime: GameTime;
  previousLocationId: string;
  newLocationId: string;
  npcs: HookNpcInfo[];
  config?: TieredSimulationConfig;
}

/**
 * Location change hook result.
 */
export interface LocationChangeHookResult {
  occupancy: LocationOccupancy;
  npcsPresent: string[];
  occupancyDescription: string;
}

/**
 * Time skip hook input.
 */
export interface TimeSkipHookInput {
  ownerEmail: string;
  sessionId: string;
  fromTime: GameTime;
  toTime: GameTime;
  playerLocationId: string;
  npcs: HookNpcInfo[];
  config?: TieredSimulationConfig;
}

/**
 * Time skip hook result.
 */
export interface TimeSkipHookResult {
  simulation: TimeSkipSimulation;
  finalLocationStates: Map<string, NpcLocationState>;
  occupancy: LocationOccupancy;
  summary: string;
}

// Logic for these hooks will depend on the bus and db implementations
// in the final refactored architecture.
