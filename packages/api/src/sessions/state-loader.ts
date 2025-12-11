/**
 * State Loader Service
 *
 * Loads all state slices at turn start, combining:
 * - Persistent slices from DB (character, setting, location, inventory, time)
 * - Session-only slices from cache (proximity, dialogue)
 *
 * This provides a unified state context for the governor and agents.
 */
import {
  CharacterProfileSchema,
  SettingProfileSchema,
  type CharacterProfile,
  type SettingProfile,
  type ProximityState,
} from '@minimal-rpg/schemas';
import type { TurnStateContext, StateObject } from '@minimal-rpg/governor';
import { db } from '../db/prismaClient.js';
import { getLocationState, getInventoryState, getTimeState } from '../db/sessionsClient.js';
import { sessionStateCache, type DialogueState } from './state-cache.js';
import type { CharacterInstanceRow, SettingInstanceRow } from '../db/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of loading state for a turn.
 */
export interface LoadedTurnState {
  /** Baseline state (immutable templates + DB-persisted profiles) */
  baseline: TurnStateContext;

  /** Current overrides from DB instances */
  overrides: Partial<TurnStateContext>;

  /** Session-only state (proximity, dialogue) from cache */
  sessionState: {
    proximity: ProximityState;
    dialogue: DialogueState;
  };

  /** Loaded instance references for persistence */
  instances: {
    primaryCharacter: CharacterInstanceRow;
    activeNpc: CharacterInstanceRow;
    setting: SettingInstanceRow;
    characterInstances: CharacterInstanceRow[];
  };

  /** Whether the active NPC is the same as the primary character */
  npcIsPrimary: boolean;
}

/**
 * Options for loading turn state.
 */
export interface LoadStateOptions {
  /** Session ID to load state for */
  sessionId: string;

  /** Optional NPC ID to use as the active NPC (defaults to primary character) */
  targetNpcId?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse JSON overrides safely.
 */
function parseOverrides(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

/**
 * Build a character state object with instance metadata.
 */
function buildCharacterState(
  profile: CharacterProfile,
  instance: CharacterInstanceRow
): StateObject {
  return {
    ...profile,
    instanceId: instance.id,
    templateId: instance.templateId,
    role: instance.role,
    ...(instance.label ? { label: instance.label } : {}),
  };
}

/**
 * Build a setting state object with instance metadata.
 */
function buildSettingState(profile: SettingProfile, instance: SettingInstanceRow): StateObject {
  return {
    ...profile,
    instanceId: instance.id,
    templateId: instance.templateId,
  };
}

// =============================================================================
// State Loader
// =============================================================================

/**
 * Load all state slices for a turn.
 *
 * This function:
 * 1. Loads character instances from DB
 * 2. Loads setting instance from DB
 * 3. Loads persisted slices (location, inventory, time)
 * 4. Loads session-only slices from cache (proximity, dialogue)
 * 5. Builds the complete TurnStateContext
 */
export async function loadStateForTurn(options: LoadStateOptions): Promise<LoadedTurnState> {
  const { sessionId, targetNpcId } = options;

  // Load all character instances for this session
  const characterInstances = await db.characterInstance.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  if (characterInstances.length === 0) {
    throw new StateLoadError(
      `No character instances found for session ${sessionId}`,
      'character_not_found'
    );
  }

  // Find primary character and active NPC
  const primaryCharacter =
    characterInstances.find((ci) => ci.role === 'primary') ?? characterInstances[0]!;

  const activeNpc = targetNpcId
    ? (characterInstances.find((ci) => ci.id === targetNpcId) ?? primaryCharacter)
    : primaryCharacter;

  const npcIsPrimary = activeNpc.id === primaryCharacter.id;

  // Load setting instance
  const settingInstance = await db.settingInstance.findUnique({
    where: { sessionId },
  });

  if (!settingInstance) {
    throw new StateLoadError(
      `No setting instance found for session ${sessionId}`,
      'setting_not_found'
    );
  }

  // Parse character and setting profiles
  let primaryCharacterBaseline: CharacterProfile;
  let activeNpcBaseline: CharacterProfile;
  let settingBaseline: SettingProfile;

  try {
    primaryCharacterBaseline = CharacterProfileSchema.parse(
      JSON.parse(primaryCharacter.profileJson)
    );

    activeNpcBaseline = npcIsPrimary
      ? primaryCharacterBaseline
      : CharacterProfileSchema.parse(JSON.parse(activeNpc.profileJson));

    settingBaseline = SettingProfileSchema.parse(JSON.parse(settingInstance.profileJson));
  } catch (err) {
    throw new StateLoadError(
      `Failed to parse profiles for session ${sessionId}: ${(err as Error).message}`,
      'profile_parse_error'
    );
  }

  // Parse overrides
  const primaryCharacterOverrides = parseOverrides(primaryCharacter.overridesJson);
  const activeNpcOverrides = npcIsPrimary
    ? primaryCharacterOverrides
    : parseOverrides(activeNpc.overridesJson);
  const settingOverrides = parseOverrides(settingInstance.overridesJson);

  // Load persisted slices
  const [storedLocation, storedInventory, storedTime] = await Promise.all([
    getLocationState(sessionId),
    getInventoryState(sessionId),
    getTimeState(sessionId),
  ]);

  // Helper to extract nested property or default to empty
  const extractNestedOrEmpty = (obj: unknown, key: string): Record<string, unknown> => {
    const value = (obj as Record<string, unknown>)?.[key];
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return Object.create(null) as Record<string, unknown>;
  };

  // Derive baseline slices from setting/character if no stored state
  const locationBaseline: Record<string, unknown> =
    storedLocation ??
    extractNestedOrEmpty(settingBaseline, 'location') ??
    extractNestedOrEmpty(primaryCharacterBaseline, 'location');

  const inventoryBaseline: Record<string, unknown> =
    storedInventory ??
    extractNestedOrEmpty(primaryCharacterBaseline, 'inventory') ??
    extractNestedOrEmpty(settingBaseline, 'inventory');

  const timeBaseline: Record<string, unknown> =
    storedTime ??
    extractNestedOrEmpty(settingBaseline, 'time') ??
    extractNestedOrEmpty(primaryCharacterBaseline, 'time');

  // Load session-only slices from cache
  const proximity = sessionStateCache.getProximity(sessionId);
  const dialogue = sessionStateCache.getDialogue(sessionId);

  // Build character and setting state objects
  const characterState = buildCharacterState(primaryCharacterBaseline, primaryCharacter);
  const settingState = buildSettingState(settingBaseline, settingInstance);
  const npcState = npcIsPrimary
    ? characterState
    : buildCharacterState(activeNpcBaseline, activeNpc);

  // Build the complete baseline context
  const baseline: TurnStateContext = {
    character: characterState,
    setting: settingState,
    location: locationBaseline,
    inventory: inventoryBaseline,
    time: timeBaseline,
    npc: npcState,
  };

  // Build overrides context (use Object.create(null) for empty records to satisfy TS)
  const emptyRecord = (): Record<string, unknown> => Object.create(null) as Record<string, unknown>;
  const overrides: Partial<TurnStateContext> = {
    character: primaryCharacterOverrides,
    setting: settingOverrides,
    npc: npcIsPrimary ? primaryCharacterOverrides : activeNpcOverrides,
    location: emptyRecord(),
    inventory: emptyRecord(),
    time: emptyRecord(),
  };

  return {
    baseline,
    overrides,
    sessionState: {
      proximity,
      dialogue,
    },
    instances: {
      primaryCharacter,
      activeNpc,
      setting: settingInstance,
      characterInstances,
    },
    npcIsPrimary,
  };
}

/**
 * Get the proximity state for a session (from cache).
 * This is a convenience wrapper for the cache.
 */
export function getProximityState(sessionId: string): ProximityState {
  return sessionStateCache.getProximity(sessionId);
}

/**
 * Get the dialogue state for a session (from cache).
 * This is a convenience wrapper for the cache.
 */
export function getDialogueState(sessionId: string): DialogueState {
  return sessionStateCache.getDialogue(sessionId);
}

// =============================================================================
// Error Class
// =============================================================================

/**
 * Error thrown when state loading fails.
 */
export class StateLoadError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'StateLoadError';
  }
}
