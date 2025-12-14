/**
 * NPC Simulation Types
 *
 * Types for the lazy simulation engine, time skip handling,
 * and tier-based simulation strategies.
 *
 * @see dev-docs/31-npc-simulation-and-performance.md
 */
import type { GameTime } from '../time/types.js';
import type { NpcTier, SimulationStrategy } from '../npc-tier/types.js';
import type { NpcLocationState, NpcActivity } from '../state/npc-location.js';

// Re-export SimulationStrategy from npc-tier for convenience
export type { SimulationStrategy };

// =============================================================================
// Simulation Trigger Types
// =============================================================================

/**
 * Events that trigger NPC simulation updates.
 */
export type SimulationTrigger = 'turn' | 'period-change' | 'location-change' | 'time-skip';

// =============================================================================
// Tiered Simulation Configuration
// =============================================================================

/**
 * Simulation configuration for a single tier.
 */
export interface TierSimulationConfig {
  /** Simulation strategy for this tier */
  readonly strategy: SimulationStrategy;
  /** Cache duration in game minutes */
  readonly cacheMinutes: number;
  /** Which triggers cause updates */
  readonly updateOn: readonly SimulationTrigger[];
  /** Whether updates are async (non-blocking) */
  readonly async: boolean;
}

/**
 * Complete simulation configuration by tier.
 */
export interface TieredSimulationConfig {
  readonly major: TierSimulationConfig;
  readonly minor: TierSimulationConfig;
  readonly background: TierSimulationConfig;
  readonly transient: TierSimulationConfig;
}

// =============================================================================
// Simulation Budget Configuration
// =============================================================================

/**
 * Performance budget for simulation processing.
 */
export interface SimulationBudgetConfig {
  /** Maximum NPCs to simulate per time advancement */
  readonly maxNpcsPerTick: number;
  /** Only simulate NPCs within N locations of player */
  readonly simulationRadius: number;
  /** Cache duration for NPC state (in game minutes) */
  readonly cacheDurationMinutes: number;
  /** Batch size for time skip simulation */
  readonly timeSkipBatchSize: number;
}

// =============================================================================
// Simulation Priority Types
// =============================================================================

/**
 * Computed simulation priority for an NPC.
 */
export interface NpcSimulationPriority {
  /** NPC identifier */
  readonly npcId: string;
  /** Base priority from tier (10 for major, 5 for minor, etc.) */
  readonly basePriority: number;
  /** Current priority adjusted by recency */
  readonly currentPriority: number;
  /** Last turn the player interacted with this NPC */
  readonly lastInteractionTurn: number;
  /** Distance from player (in location hops) */
  readonly distanceFromPlayer: number;
}

// =============================================================================
// Simulation Result Types
// =============================================================================

/**
 * Result of simulating a single NPC.
 */
export interface NpcSimulationResult {
  /** NPC identifier */
  readonly npcId: string;
  /** Previous state (before simulation) */
  readonly previousState: NpcLocationState;
  /** New state (after simulation) */
  readonly newState: NpcLocationState;
  /** Whether state changed */
  readonly stateChanged: boolean;
  /** What triggered this simulation */
  readonly trigger: SimulationTrigger;
}

/**
 * Result of processing a simulation tick.
 */
export interface SimulationTickResult {
  /** Results for major NPCs (synchronous) */
  readonly majorResults: readonly NpcSimulationResult[];
  /** Number of minor NPCs queued for async update */
  readonly minorQueued: number;
  /** Number of background NPCs queued for async update */
  readonly backgroundQueued: number;
  /** Current game time */
  readonly processedAt: GameTime;
}

// =============================================================================
// Time Skip Types
// =============================================================================

/**
 * State change during a time skip.
 */
export interface NpcStateChange {
  /** NPC identifier */
  readonly npcId: string;
  /** State before the time skip */
  readonly previousState: NpcLocationState;
  /** State after the time skip */
  readonly newState: NpcLocationState;
  /** Intermediate locations visited (if any) */
  readonly intermediateLocations?: readonly string[] | undefined;
}

/**
 * Event that occurred during simulated time skip.
 */
export interface SimulatedEvent {
  /** When the event occurred */
  readonly time: GameTime;
  /** Event type identifier */
  readonly type: string;
  /** Human-readable description */
  readonly description: string;
  /** NPCs involved in the event */
  readonly involvedNpcs: readonly string[];
}

/**
 * Complete result of time skip simulation.
 */
export interface TimeSkipSimulation {
  /** NPCs whose state changed during the skip */
  readonly stateChanges: readonly NpcStateChange[];
  /** Notable events that occurred */
  readonly events: readonly SimulatedEvent[];
  /** Start time of the skip */
  readonly fromTime: GameTime;
  /** End time of the skip */
  readonly toTime: GameTime;
}

// =============================================================================
// Simulation Task Types
// =============================================================================

/**
 * Task in the async simulation queue.
 */
export interface SimulationTask {
  /** NPC to simulate */
  readonly npcId: string;
  /** Current game time */
  readonly time: GameTime;
  /** What triggered this simulation */
  readonly trigger: SimulationTrigger;
  /** Priority for queue ordering */
  readonly priority: number;
}

// =============================================================================
// Fidelity Configuration
// =============================================================================

/**
 * Simulation fidelity based on distance from player.
 */
export type SimulationFidelity = 'full' | 'cached' | 'coarse' | 'none';

/**
 * Distance-based fidelity mapping.
 */
export interface FidelityByDistance {
  /** Same location as player */
  readonly sameLocation: SimulationFidelity;
  /** Adjacent to player's location */
  readonly adjacent: SimulationFidelity;
  /** Same area but not adjacent */
  readonly sameArea: SimulationFidelity;
  /** Far from player */
  readonly distant: SimulationFidelity;
}

// =============================================================================
// Cache Types
// =============================================================================

/**
 * Cached simulation result with metadata.
 */
export interface CachedSimulation {
  /** Cached state */
  readonly state: NpcLocationState;
  /** When this was computed */
  readonly computedAt: GameTime;
  /** When this cache entry expires */
  readonly expiresAt: GameTime;
  /** What fidelity was used */
  readonly fidelity: SimulationFidelity;
}

/**
 * Cache invalidation event.
 */
export interface CacheInvalidationEvent {
  /** Event type */
  readonly type: 'period-change' | 'weather-change' | 'flag-change' | 'location-change';
  /** Event payload */
  readonly payload?: Readonly<Record<string, unknown>> | undefined;
}

// =============================================================================
// NPC Info for Simulation
// =============================================================================

/**
 * NPC information needed for simulation.
 */
export interface NpcSimulationInfo {
  /** NPC identifier */
  readonly id: string;
  /** NPC tier */
  readonly tier: NpcTier;
  /** NPC's schedule ID */
  readonly scheduleId?: string | undefined;
  /** Current location ID */
  readonly locationId: string;
  /** Tier priority value */
  readonly tierPriority: number;
  /** Turns since last player interaction */
  readonly turnsSinceInteraction: number;
}
