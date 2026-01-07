/**
 * Simulation Hooks
 *
 * Integrates the simulation system with turn processing by providing
 * hooks that run at specific points in the game flow:
 *
 * - Turn Hook: Run eager/active NPC simulation after each turn
 * - Period Change Hook: Simulate lazy NPCs on day period change
 * - Location Change Hook: Calculate occupancy when player moves
 * - Time Skip Handler: Batch simulate NPCs during time skips
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */
import {
  DEFAULT_TIERED_SIMULATION_CONFIG,
  createEmptyOccupancy,
  categorizeCrowdLevel,
} from '@minimal-rpg/schemas';
import type { SimulationNpcInfo } from './simulation-service.js';
import { runSimulationTick, runTimeSkipSimulation } from './simulation-service.js';
import type { NpcScheduleData } from './schedule-service.js';
import { listActorStatesForSession, bulkUpsertActorStates } from '@minimal-rpg/db/node';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * NPC info for hooks (combines schedule and tier info).
 */
export interface HookNpcInfo {
  npcId: string;
  tier: NpcTier;
  scheduleData: NpcScheduleData;
  lastInteractionTurn?: number | undefined;
  distanceFromPlayer?: number | undefined;
}

/**
 * Simulation states extracted from actor states.
 */
interface SimulationContext {
  lastComputedAt?: any;
  dayDecisions?: any;
  currentState?: NpcLocationState;
}

/**
 * Turn hook input.
 */
export interface TurnHookInput {
  /** Owner key for tenancy scoping */
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
  /** NPCs that were simulated */
  simulatedNpcs: string[];
  /** Updated location states */
  locationStates: Map<string, NpcLocationState>;
  /** NPCs now at player's location */
  npcsAtPlayerLocation: string[];
  /** Whether any NPC entered player's location */
  npcEnteredLocation: boolean;
  /** Whether any NPC left player's location */
  npcLeftLocation: boolean;
}

/**
 * Period change hook input.
 */
export interface PeriodChangeHookInput {
  /** Owner key for tenancy scoping */
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
  /** NPCs that were simulated */
  simulatedNpcs: string[];
  /** Updated location states */
  locationStates: Map<string, NpcLocationState>;
  /** Occupancy changes at player's location */
  locationOccupancyChanged: boolean;
}

/**
 * Location change hook input.
 */
export interface LocationChangeHookInput {
  /** Owner key for tenancy scoping */
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
  /** Occupancy at new location */
  occupancy: LocationOccupancy;
  /** NPCs present at new location */
  npcsPresent: string[];
  /** Narrative-ready description of location population */
  occupancyDescription: string;
}

/**
 * Time skip hook input.
 */
export interface TimeSkipHookInput {
  /** Owner key for tenancy scoping */
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
  /** Time skip simulation results */
  simulation: TimeSkipSimulation;
  /** Final location states after skip */
  finalLocationStates: Map<string, NpcLocationState>;
  /** Occupancy at player's location after skip */
  occupancy: LocationOccupancy;
  /** Summary of changes during skip */
  summary: string;
}

// =============================================================================
// Hook Implementations
// =============================================================================

/**
 * Turn hook: Run after each player turn.
 * Simulates eager and active NPCs to keep them up-to-date.
 *
 * @param input - Turn hook input
 * @returns Turn hook result
 */
export async function onTurnComplete(input: TurnHookInput): Promise<TurnHookResult> {
  const {
    sessionId,
    currentTime,
    playerLocationId,
    currentTurn,
    npcs,
    config = DEFAULT_TIERED_SIMULATION_CONFIG,
  } = input;

  // Convert to simulation NPC info
  const simulationNpcs: SimulationNpcInfo[] = npcs.map((npc) => ({
    npcId: npc.npcId,
    tier: npc.tier,
    scheduleData: npc.scheduleData,
    lastInteractionTurn: npc.lastInteractionTurn,
    distanceFromPlayer: npc.distanceFromPlayer,
  }));

  // Get current NPC states
  const actorStates = await listActorStatesForSession(sessionId as any);
  const npcStatesByActorId = new Map(
    actorStates.filter((s) => s.actorType === 'npc').map((s) => [s.actorId, s])
  );

  const previousLocationStates = new Map<string, NpcLocationState>();

  for (const npcInfo of simulationNpcs) {
    const actorState = npcStatesByActorId.get(npcInfo.npcId);
    if (actorState) {
      const stateObj = actorState.state as any;
      const simData = stateObj.simulation || {};

      npcInfo.currentState = simData.currentState || stateObj.locationState;
      if (npcInfo.currentState) {
        previousLocationStates.set(npcInfo.npcId, npcInfo.currentState);
      }
    }
  }

  // Track who was at player's location before
  const previousNpcsAtLocation = new Set(
    Array.from(previousLocationStates.entries())
      .filter(([, state]) => state.locationId === playerLocationId)
      .map(([npcId]) => npcId)
  );

  // Run simulation for turn trigger (affects eager/active tiers)
  const result = runSimulationTick(simulationNpcs, {
    currentTime,
    trigger: 'turn',
    playerLocationId,
    currentTurn,
    config,
  });

  // Build updated location states
  const locationStates = new Map<string, NpcLocationState>();
  const updates: any[] = [];

  for (const simResult of result.results) {
    locationStates.set(simResult.npcId, simResult.newState);

    if (simResult.stateChanged) {
      const actorState = npcStatesByActorId.get(simResult.npcId);
      if (actorState) {
        const stateObj = actorState.state as any;
        const newState = {
          ...stateObj,
          simulation: {
            ...(stateObj.simulation || {}),
            currentState: simResult.newState,
            lastComputedAt: currentTime,
          },
        };

        updates.push({
          sessionId: sessionId as any,
          actorId: simResult.npcId,
          actorType: 'npc',
          entityProfileId: actorState.entityProfileId,
          state: newState,
          lastEventSeq: actorState.lastEventSeq,
        });
      }
    }
  }

  // Bulk update
  if (updates.length > 0) {
    await bulkUpsertActorStates(updates);
  }

  // Check for location changes
  const currentNpcsAtLocation = new Set(
    Array.from(locationStates.entries())
      .filter(([, state]) => state.locationId === playerLocationId)
      .map(([npcId]) => npcId)
  );

  const npcEnteredLocation = Array.from(currentNpcsAtLocation).some(
    (npcId) => !previousNpcsAtLocation.has(npcId)
  );
  const npcLeftLocation = Array.from(previousNpcsAtLocation).some(
    (npcId) => !currentNpcsAtLocation.has(npcId)
  );

  return {
    simulatedNpcs: result.results.map((r) => r.npcId),
    locationStates,
    npcsAtPlayerLocation: Array.from(currentNpcsAtLocation),
    npcEnteredLocation,
    npcLeftLocation,
  };
}

/**
 * Period change hook: Run when the day period changes.
 * Simulates lazy NPCs that only update on period boundaries.
 *
 * @param input - Period change hook input
 * @returns Period change hook result
 */
export async function onPeriodChange(
  input: PeriodChangeHookInput
): Promise<PeriodChangeHookResult> {
  const {
    sessionId,
    currentTime,
    playerLocationId,
    npcs,
    config = DEFAULT_TIERED_SIMULATION_CONFIG,
  } = input;

  // Convert to simulation NPC info
  const simulationNpcs: SimulationNpcInfo[] = npcs.map((npc) => ({
    npcId: npc.npcId,
    tier: npc.tier,
    scheduleData: npc.scheduleData,
  }));

  // Get current NPC states
  const actorStates = await listActorStatesForSession(sessionId as any);
  const npcStatesByActorId = new Map(
    actorStates.filter((s) => s.actorType === 'npc').map((s) => [s.actorId, s])
  );

  const previousOccupancy = new Set<string>();

  for (const npcInfo of simulationNpcs) {
    const actorState = npcStatesByActorId.get(npcInfo.npcId);
    if (actorState) {
      const stateObj = actorState.state as any;
      const simData = stateObj.simulation || {};

      npcInfo.currentState = simData.currentState || stateObj.locationState;
      if (npcInfo.currentState?.locationId === playerLocationId) {
        previousOccupancy.add(npcInfo.npcId);
      }
    }
  }

  // Run simulation for period-change trigger (affects lazy tier)
  const result = runSimulationTick(simulationNpcs, {
    currentTime,
    trigger: 'period-change',
    playerLocationId,
    config,
  });

  // Build updated location states
  const locationStates = new Map<string, NpcLocationState>();
  const updates: any[] = [];
  const newOccupancy = new Set<string>();

  for (const simResult of result.results) {
    locationStates.set(simResult.npcId, simResult.newState);

    if (simResult.newState.locationId === playerLocationId) {
      newOccupancy.add(simResult.npcId);
    }

    if (simResult.stateChanged) {
      const actorState = npcStatesByActorId.get(simResult.npcId);
      if (actorState) {
        const stateObj = actorState.state as any;
        const newState = {
          ...stateObj,
          simulation: {
            ...(stateObj.simulation || {}),
            currentState: simResult.newState,
            lastComputedAt: currentTime,
          },
        };

        updates.push({
          sessionId: sessionId as any,
          actorId: simResult.npcId,
          actorType: 'npc',
          entityProfileId: actorState.entityProfileId,
          state: newState,
          lastEventSeq: actorState.lastEventSeq,
        });
      }
    }
  }

  // Bulk update
  if (updates.length > 0) {
    await bulkUpsertActorStates(updates);
  }

  // Check if occupancy changed
  const locationOccupancyChanged =
    previousOccupancy.size !== newOccupancy.size ||
    Array.from(previousOccupancy).some((npcId) => !newOccupancy.has(npcId));

  return {
    simulatedNpcs: result.results.map((r) => r.npcId),
    locationStates,
    locationOccupancyChanged,
  };
}

/**
 * Location change hook: Run when the player changes location.
 * Calculates occupancy at the new location and simulates on-demand NPCs.
 *
 * @param input - Location change hook input
 * @returns Location change hook result
 */
export async function onLocationChange(
  input: LocationChangeHookInput
): Promise<LocationChangeHookResult> {
  const {
    sessionId,
    currentTime,
    newLocationId,
    npcs,
    config = DEFAULT_TIERED_SIMULATION_CONFIG,
  } = input;

  // Convert to simulation NPC info
  const simulationNpcs: SimulationNpcInfo[] = npcs.map((npc) => ({
    npcId: npc.npcId,
    tier: npc.tier,
    scheduleData: npc.scheduleData,
  }));

  // Get current NPC states
  const actorStates = await listActorStatesForSession(sessionId as any);
  const npcStatesByActorId = new Map(
    actorStates.filter((s) => s.actorType === 'npc').map((s) => [s.actorId, s])
  );

  for (const npcInfo of simulationNpcs) {
    const actorState = npcStatesByActorId.get(npcInfo.npcId);
    if (actorState) {
      const stateObj = actorState.state as any;
      const simData = stateObj.simulation || {};
      npcInfo.currentState = simData.currentState || stateObj.locationState;
    }
  }

  // Run simulation for location-change trigger (affects on-demand tier)
  const result = runSimulationTick(simulationNpcs, {
    currentTime,
    trigger: 'location-change',
    playerLocationId: newLocationId,
    config,
  });

  // Build location states and update
  const updates: any[] = [];
  const npcsPresent: string[] = [];

  for (const simResult of result.results) {
    if (simResult.newState.locationId === newLocationId) {
      npcsPresent.push(simResult.npcId);
    }

    if (simResult.stateChanged) {
      const actorState = npcStatesByActorId.get(simResult.npcId);
      if (actorState) {
        const stateObj = actorState.state as any;
        const newState = {
          ...stateObj,
          simulation: {
            ...(stateObj.simulation || {}),
            currentState: simResult.newState,
            lastComputedAt: currentTime,
          },
        };

        updates.push({
          sessionId: sessionId as any,
          actorId: simResult.npcId,
          actorType: 'npc',
          entityProfileId: actorState.entityProfileId,
          state: newState,
          lastEventSeq: actorState.lastEventSeq,
        });
      }
    }
  }

  // Bulk update
  if (updates.length > 0) {
    await bulkUpsertActorStates(updates);
  }

  // Build occupancy using the factory function
  const occupancy = createEmptyOccupancy(newLocationId, currentTime);

  // Build present NPCs array
  const presentNpcs: PresentNpc[] = npcsPresent.map((npcId) => {
    const simResult = result.results.find((r) => r.npcId === npcId);
    return {
      npcId,
      activity: simResult?.newState.activity ?? {
        type: 'idle',
        description: 'Standing around',
        engagement: 'casual',
      },
      arrivedAt: currentTime,
      proximity: 'near' as const,
    };
  });

  // Create the final occupancy object
  const finalOccupancy: LocationOccupancy = {
    ...occupancy,
    present: presentNpcs,
    crowdLevel: categorizeCrowdLevel(npcsPresent.length, 0),
  };

  // Generate description
  const occupancyDescription = generateOccupancyDescription(
    npcsPresent.length,
    finalOccupancy.crowdLevel
  );

  return {
    occupancy: finalOccupancy,
    npcsPresent,
    occupancyDescription,
  };
}

/**
 * Time skip hook: Run during significant time advances.
 * Batch simulates all NPCs from start to end time.
 *
 * @param input - Time skip hook input
 * @returns Time skip hook result
 */
export async function onTimeSkip(input: TimeSkipHookInput): Promise<TimeSkipHookResult> {
  const {
    sessionId,
    fromTime,
    toTime,
    playerLocationId,
    npcs,
    config = DEFAULT_TIERED_SIMULATION_CONFIG,
  } = input;

  // Convert to simulation NPC info
  const simulationNpcs: SimulationNpcInfo[] = npcs.map((npc) => ({
    npcId: npc.npcId,
    tier: npc.tier,
    scheduleData: npc.scheduleData,
  }));

  // Get current NPC states
  const actorStates = await listActorStatesForSession(sessionId as any);
  const npcStatesByActorId = new Map(
    actorStates.filter((s) => s.actorType === 'npc').map((s) => [s.actorId, s])
  );

  for (const npcInfo of simulationNpcs) {
    const actorState = npcStatesByActorId.get(npcInfo.npcId);
    if (actorState) {
      const stateObj = actorState.state as any;
      const simData = stateObj.simulation || {};
      npcInfo.currentState = simData.currentState || stateObj.locationState;
    }
  }

  // Run time skip simulation
  const simulation = runTimeSkipSimulation(simulationNpcs, fromTime, toTime, {
    playerLocationId,
    config,
  });

  // Build final location states and update
  const finalLocationStates = new Map<string, NpcLocationState>();
  const updates: any[] = [];
  const npcsAtLocation: string[] = [];

  for (const change of simulation.stateChanges) {
    finalLocationStates.set(change.npcId, change.newState);

    if (change.newState.locationId === playerLocationId) {
      npcsAtLocation.push(change.npcId);
    }

    const actorState = npcStatesByActorId.get(change.npcId);
    if (actorState) {
      const stateObj = actorState.state as any;
      const newState = {
        ...stateObj,
        simulation: {
          ...(stateObj.simulation || {}),
          currentState: change.newState,
          lastComputedAt: toTime,
        },
      };

      updates.push({
        sessionId: sessionId as any,
        actorId: change.npcId,
        actorType: 'npc',
        entityProfileId: actorState.entityProfileId,
        state: newState,
        lastEventSeq: actorState.lastEventSeq,
      });
    }
  }

  // Bulk update
  if (updates.length > 0) {
    await bulkUpsertActorStates(updates);
  }

  // Build occupancy using the factory function
  const occupancy = createEmptyOccupancy(playerLocationId, toTime);

  // Build present NPCs array
  const presentNpcs: PresentNpc[] = npcsAtLocation.map((npcId) => {
    const state = finalLocationStates.get(npcId);
    return {
      npcId,
      activity: state?.activity ?? {
        type: 'idle',
        description: 'Standing around',
        engagement: 'casual',
      },
      arrivedAt: toTime,
      proximity: 'near' as const,
    };
  });

  // Create the final occupancy object
  const finalOccupancy: LocationOccupancy = {
    ...occupancy,
    present: presentNpcs,
    crowdLevel: categorizeCrowdLevel(npcsAtLocation.length, 0),
  };

  // Generate summary
  const summary = generateTimeSkipSummary(simulation);

  return {
    simulation,
    finalLocationStates,
    occupancy: finalOccupancy,
    summary,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a narrative description of location occupancy.
 */
function generateOccupancyDescription(npcCount: number, crowdLevel: CrowdLevel): string {
  if (npcCount === 0) {
    return 'The area is deserted.';
  }

  if (npcCount === 1) {
    return 'Someone is here.';
  }

  switch (crowdLevel) {
    case 'empty':
      return 'The area is nearly empty.';
    case 'sparse':
      return 'A few people are around.';
    case 'moderate':
      return 'There is a moderate crowd here.';
    case 'crowded':
      return 'The area is crowded with people.';
    case 'packed':
      return 'The area is packed wall to wall.';
    default:
      return `There are ${npcCount} people here.`;
  }
}

/**
 * Generate a summary of what happened during a time skip.
 */
function generateTimeSkipSummary(simulation: TimeSkipSimulation): string {
  const changedCount = simulation.stateChanges.filter(
    (c) => c.previousState.locationId !== c.newState.locationId
  ).length;

  if (changedCount === 0) {
    return 'Time passes quietly. Everyone remains where they were.';
  }

  if (changedCount === 1) {
    return 'During this time, someone moved to a different location.';
  }

  return `During this time, ${changedCount} people moved to different locations.`;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a narrative description of location occupancy.
 */
function generateOccupancyDescription(npcCount: number, crowdLevel: CrowdLevel): string {
  if (npcCount === 0) {
    return 'The area is deserted.';
  }

  if (npcCount === 1) {
    return 'Someone is here.';
  }

  switch (crowdLevel) {
    case 'empty':
      return 'The area is nearly empty.';
    case 'sparse':
      return 'A few people are around.';
    case 'moderate':
      return 'There is a moderate crowd here.';
    case 'crowded':
      return 'The area is crowded with people.';
    case 'packed':
      return 'The area is packed wall to wall.';
    default:
      return `There are ${npcCount} people here.`;
  }
}

/**
 * Generate a summary of what happened during a time skip.
 */
function generateTimeSkipSummary(simulation: TimeSkipSimulation): string {
  const changedCount = simulation.stateChanges.filter(
    (c) => c.previousState.locationId !== c.newState.locationId
  ).length;

  if (changedCount === 0) {
    return 'Time passes quietly. Everyone remains where they were.';
  }

  if (changedCount === 1) {
    return 'During this time, someone moved to a different location.';
  }

  return `During this time, ${changedCount} people moved to different locations.`;
}
