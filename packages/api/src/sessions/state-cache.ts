/**
 * Session State Cache
 *
 * In-memory cache for session-only state slices (proximity, dialogue).
 * These slices don't persist to the database but need to survive across turns
 * within a session.
 *
 * For production scalability, this could be replaced with Redis or similar.
 */
import {
  type ProximityState,
  createDefaultProximityState,
  ProximityStateSchema,
} from '@minimal-rpg/schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * Dialogue state for tracking recent conversation context.
 * Tracks tone, disposition, and transient conversation metadata.
 */
export interface DialogueState {
  /** Current conversation tone (e.g., 'friendly', 'tense', 'playful') */
  tone?: string;

  /** NPC's current disposition toward the player */
  npcDisposition?: Record<string, string>;

  /** Turn number of last dialogue exchange */
  lastDialogueTurn?: number;

  /** Transient context flags (cleared at session end) */
  flags?: Record<string, boolean | string | number>;
}

/**
 * All session-only state slices stored in the cache.
 */
export interface SessionCacheEntry {
  /** Proximity/sensory engagement state */
  proximity: ProximityState;

  /** Dialogue context state */
  dialogue: DialogueState;

  /** Last access timestamp (for TTL-based cleanup) */
  lastAccessedAt: number;

  /** Turn number when cache was last updated */
  lastUpdatedTurn?: number;
}

/**
 * Options for session state cache operations.
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttlMs?: number;

  /** Maximum number of sessions to cache (default: 1000) */
  maxSessions?: number;
}

// =============================================================================
// Default Constants
// =============================================================================

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_SESSIONS = 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Session State Cache
// =============================================================================

/**
 * In-memory cache for session-only state slices.
 * Provides fast access to proximity and dialogue state without DB queries.
 */
export class SessionStateCache {
  private readonly cache = new Map<string, SessionCacheEntry>();
  private readonly ttlMs: number;
  private readonly maxSessions: number;
  private cleanupIntervalId?: ReturnType<typeof setInterval>;

  constructor(options: CacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;

    // Start periodic cleanup
    this.startCleanup();
  }

  // ===========================================================================
  // Core Operations
  // ===========================================================================

  /**
   * Get the cached entry for a session.
   * Returns undefined if no entry exists.
   */
  get(sessionId: string): SessionCacheEntry | undefined {
    const entry = this.cache.get(sessionId);
    if (entry) {
      // Update last accessed time on read
      entry.lastAccessedAt = Date.now();
    }
    return entry;
  }

  /**
   * Get or create a cache entry for a session.
   * If no entry exists, creates one with default state.
   */
  getOrCreate(sessionId: string): SessionCacheEntry {
    let entry = this.cache.get(sessionId);
    if (!entry) {
      entry = this.createDefaultEntry();
      this.cache.set(sessionId, entry);
      this.evictIfNeeded();
    } else {
      entry.lastAccessedAt = Date.now();
    }
    return entry;
  }

  /**
   * Update the proximity state for a session.
   */
  setProximity(sessionId: string, proximity: ProximityState, turnNumber?: number): void {
    const entry = this.getOrCreate(sessionId);
    entry.proximity = proximity;
    entry.lastAccessedAt = Date.now();
    if (turnNumber !== undefined) {
      entry.lastUpdatedTurn = turnNumber;
    }
  }

  /**
   * Update the dialogue state for a session.
   */
  setDialogue(sessionId: string, dialogue: DialogueState, turnNumber?: number): void {
    const entry = this.getOrCreate(sessionId);
    entry.dialogue = { ...entry.dialogue, ...dialogue };
    entry.lastAccessedAt = Date.now();
    if (turnNumber !== undefined) {
      entry.lastUpdatedTurn = turnNumber;
    }
  }

  /**
   * Get the proximity state for a session.
   * Returns default state if no entry exists.
   */
  getProximity(sessionId: string): ProximityState {
    const entry = this.get(sessionId);
    return entry?.proximity ?? createDefaultProximityState();
  }

  /**
   * Get the dialogue state for a session.
   * Returns empty object if no entry exists.
   */
  getDialogue(sessionId: string): DialogueState {
    const entry = this.get(sessionId);
    return entry?.dialogue ?? {};
  }

  /**
   * Apply proximity patches and return the new state.
   * This is a convenience method for the turn handler.
   */
  applyProximityPatches(
    sessionId: string,
    newProximity: ProximityState,
    turnNumber?: number
  ): ProximityState {
    // Validate the new state
    const result = ProximityStateSchema.safeParse(newProximity);
    if (!result.success) {
      console.warn(
        `[SessionStateCache] Invalid proximity state for session ${sessionId}:`,
        result.error.message
      );
      // Return current state if validation fails
      return this.getProximity(sessionId);
    }

    this.setProximity(sessionId, result.data, turnNumber);
    return result.data;
  }

  /**
   * Delete a session's cached state.
   */
  delete(sessionId: string): boolean {
    return this.cache.delete(sessionId);
  }

  /**
   * Check if a session has cached state.
   */
  has(sessionId: string): boolean {
    return this.cache.has(sessionId);
  }

  /**
   * Clear all cached sessions.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of cached sessions.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all session IDs in the cache.
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // ===========================================================================
  // Lifecycle Management
  // ===========================================================================

  /**
   * Stop the cleanup interval (for graceful shutdown).
   */
  stop(): void {
    if (this.cleanupIntervalId !== undefined) {
      clearInterval(this.cleanupIntervalId);
      // @ts-expect-error - Clearing the interval ID for GC, field is optional
      this.cleanupIntervalId = undefined;
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private createDefaultEntry(): SessionCacheEntry {
    return {
      proximity: createDefaultProximityState(),
      dialogue: {},
      lastAccessedAt: Date.now(),
    };
  }

  private startCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.evictExpired();
    }, CLEANUP_INTERVAL_MS);

    // Don't block process exit on this timer
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  private evictExpired(): void {
    const now = Date.now();
    const cutoff = now - this.ttlMs;

    for (const [sessionId, entry] of this.cache) {
      if (entry.lastAccessedAt < cutoff) {
        this.cache.delete(sessionId);
      }
    }
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSessions) {
      return;
    }

    // Evict oldest entries until we're under the limit
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt
    );

    const toEvict = entries.slice(0, this.cache.size - this.maxSessions);
    for (const [sessionId] of toEvict) {
      this.cache.delete(sessionId);
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Shared session state cache instance.
 * For production, this could be backed by Redis for multi-process support.
 */
export const sessionStateCache = new SessionStateCache();
