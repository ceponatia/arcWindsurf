/**
 * State Persister Service
 *
 * Persists state changes at turn end:
 * - Persistent slices to DB (character, setting, location, inventory, time)
 * - Session-only slices to cache (proximity, dialogue)
 *
 * This ensures state changes from tool execution are durably saved.
 */
import type { TurnStateChanges, TurnStateContext } from '@minimal-rpg/governor';
import type { DeepPartial } from '@minimal-rpg/state-manager';
import type { ProximityState } from '@minimal-rpg/schemas';
import { db } from '../db/prismaClient.js';
import {
  upsertLocationState,
  upsertInventoryState,
  upsertTimeState,
} from '../db/sessionsClient.js';
import { sessionStateCache, type DialogueState } from './state-cache.js';
import type { CharacterInstanceRow, SettingInstanceRow } from '../db/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for persisting turn state.
 */
export interface PersistStateOptions {
  /** Session ID to persist state for */
  sessionId: string;

  /** State changes from the turn result */
  stateChanges: TurnStateChanges;

  /** Loaded instance references (for updating the correct DB rows) */
  instances: {
    primaryCharacter: CharacterInstanceRow;
    activeNpc: CharacterInstanceRow;
    setting: SettingInstanceRow;
  };

  /** Whether the active NPC is the same as the primary character */
  npcIsPrimary: boolean;

  /** Current turn number (for session cache timestamps) */
  turnNumber?: number;
}

/**
 * Options for persisting session-only state.
 */
export interface PersistSessionStateOptions {
  /** Session ID */
  sessionId: string;

  /** Proximity state to persist to cache */
  proximity?: ProximityState;

  /** Dialogue state to persist to cache */
  dialogue?: DialogueState;

  /** Current turn number */
  turnNumber?: number;
}

/**
 * Result of persisting state.
 */
export interface PersistStateResult {
  /** Whether persistence was successful */
  success: boolean;

  /** Slices that were persisted */
  persistedSlices: string[];

  /** Errors that occurred (if any) */
  errors?: { slice: string; error: string }[];
}

// =============================================================================
// State Persister
// =============================================================================

/**
 * Persist state changes from a turn result.
 *
 * This function:
 * 1. Persists character/NPC profile changes to DB
 * 2. Persists setting changes to DB
 * 3. Persists location/inventory/time slices to DB
 * 4. Persists proximity/dialogue to session cache
 */
export async function persistTurnState(options: PersistStateOptions): Promise<PersistStateResult> {
  const { sessionId, stateChanges, instances, npcIsPrimary, turnNumber } = options;

  const persistedSlices: string[] = [];
  const errors: { slice: string; error: string }[] = [];

  // Skip if no state changes
  if (!stateChanges.patchCount || stateChanges.patchCount === 0) {
    return { success: true, persistedSlices };
  }

  const effective = stateChanges.newEffectiveState;
  const newOverrides = stateChanges.newOverrides;

  // Persist character slice
  if (effective?.character && instances.primaryCharacter.id) {
    try {
      await db.characterInstance.update({
        where: { id: instances.primaryCharacter.id },
        data: { profileJson: JSON.stringify(effective.character) },
      });
      persistedSlices.push('character');
    } catch (err) {
      errors.push({ slice: 'character', error: (err as Error).message });
    }
  }

  // Persist NPC slice (when distinct from primary)
  if (effective?.npc && instances.activeNpc.id) {
    const npcPayload = npcIsPrimary && effective.character ? effective.character : effective.npc;
    try {
      await db.characterInstance.update({
        where: { id: instances.activeNpc.id },
        data: { profileJson: JSON.stringify(npcPayload) },
      });
      if (!npcIsPrimary) {
        persistedSlices.push('npc');
      }
    } catch (err) {
      errors.push({ slice: 'npc', error: (err as Error).message });
    }
  }

  // Persist setting slice
  if (effective?.setting && instances.setting.id) {
    try {
      await db.settingInstance.update({
        where: { id: instances.setting.id },
        data: { profileJson: JSON.stringify(effective.setting) },
      });
      persistedSlices.push('setting');
    } catch (err) {
      errors.push({ slice: 'setting', error: (err as Error).message });
    }
  }

  // Persist per-session slices
  if (effective?.location) {
    try {
      await upsertLocationState(sessionId, effective.location);
      persistedSlices.push('location');
    } catch (err) {
      errors.push({ slice: 'location', error: (err as Error).message });
    }
  }

  if (effective?.inventory) {
    try {
      await upsertInventoryState(sessionId, effective.inventory);
      persistedSlices.push('inventory');
    } catch (err) {
      errors.push({ slice: 'inventory', error: (err as Error).message });
    }
  }

  if (effective?.time) {
    try {
      await upsertTimeState(sessionId, effective.time);
      persistedSlices.push('time');
    } catch (err) {
      errors.push({ slice: 'time', error: (err as Error).message });
    }
  }

  // Persist overrides if present
  if (newOverrides) {
    await persistOverrides(instances, newOverrides, npcIsPrimary, errors);
  }

  // Persist proximity state to session cache (extracted from stateChanges)
  const proximityFromChanges = extractProximityFromChanges(stateChanges);
  if (proximityFromChanges) {
    sessionStateCache.setProximity(sessionId, proximityFromChanges, turnNumber);
    persistedSlices.push('proximity');
  }

  const result: PersistStateResult = {
    success: errors.length === 0,
    persistedSlices,
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/**
 * Persist session-only state (proximity, dialogue) to cache.
 * This is called independently of DB persistence.
 */
export function persistSessionState(options: PersistSessionStateOptions): void {
  const { sessionId, proximity, dialogue, turnNumber } = options;

  if (proximity) {
    sessionStateCache.setProximity(sessionId, proximity, turnNumber);
  }

  if (dialogue) {
    sessionStateCache.setDialogue(sessionId, dialogue, turnNumber);
  }
}

/**
 * Clear session state from cache (e.g., on session delete).
 */
export function clearSessionState(sessionId: string): boolean {
  return sessionStateCache.delete(sessionId);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Persist overrides to DB.
 */
async function persistOverrides(
  instances: PersistStateOptions['instances'],
  newOverrides: DeepPartial<TurnStateContext>,
  npcIsPrimary: boolean,
  errors: { slice: string; error: string }[]
): Promise<void> {
  const primaryOverridesUpdate =
    npcIsPrimary && newOverrides.npc ? newOverrides.npc : newOverrides.character;

  if (primaryOverridesUpdate && instances.primaryCharacter.id) {
    try {
      await db.characterInstance.update({
        where: { id: instances.primaryCharacter.id },
        data: { overridesJson: JSON.stringify(primaryOverridesUpdate) },
      });
    } catch (err) {
      errors.push({ slice: 'character_overrides', error: (err as Error).message });
    }
  }

  if (!npcIsPrimary && newOverrides.npc && instances.activeNpc.id) {
    try {
      await db.characterInstance.update({
        where: { id: instances.activeNpc.id },
        data: { overridesJson: JSON.stringify(newOverrides.npc) },
      });
    } catch (err) {
      errors.push({ slice: 'npc_overrides', error: (err as Error).message });
    }
  }

  if (newOverrides.setting && instances.setting.id) {
    try {
      await db.settingInstance.update({
        where: { id: instances.setting.id },
        data: { overridesJson: JSON.stringify(newOverrides.setting) },
      });
    } catch (err) {
      errors.push({ slice: 'setting_overrides', error: (err as Error).message });
    }
  }
}

/**
 * Extract proximity state from state changes.
 * The proximity slice may be embedded in the effective state or patches.
 */
function extractProximityFromChanges(stateChanges: TurnStateChanges): ProximityState | undefined {
  // Check if proximity is in the effective state
  const effective = stateChanges.newEffectiveState;
  if (effective && 'proximity' in effective) {
    return effective['proximity'] as ProximityState;
  }

  // Check modified paths for proximity updates
  const hasProximityPatch = stateChanges.modifiedPaths?.some(
    (path) => path.startsWith('/proximity') || path.startsWith('proximity')
  );

  if (hasProximityPatch && stateChanges.patches) {
    // For now, return undefined and let the caller handle proximity separately
    // A full implementation would reconstruct proximity from patches
    return undefined;
  }

  return undefined;
}
