/**
 * State Loader Service
 *
 * Loads all state slices at turn start, combining:
 * - Persistent slices from DB (character, setting, location, inventory, time, affinity)
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
  type CharacterInstanceAffinity,
  type NpcLocationState,
  type GameTime,
  type NpcSchedule,
  type NpcScheduleRef,
} from '@minimal-rpg/schemas';
import type { TurnStateContext, StateObject } from '@minimal-rpg/governor';
import { db } from '../db/prismaClient.js';
import {
  getLocationState,
  getInventoryState,
  getTimeState,
  getAllAffinityStates,
  getAllNpcLocationStates,
} from '../db/sessionsClient.js';
import { sessionStateCache, type DialogueState } from './state-cache.js';
import { checkNpcAvailability, type NpcScheduleData } from './schedule-service.js';
import type { CharacterInstanceRow, SettingInstanceRow } from '../db/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Local NPC context type (mirrors NpcContext from governor).
 * Defined locally to avoid circular dependency.
 */
interface NpcContextLocal {
  schedule?: {
    currentSlotId?: string;
    activity?: string;
    scheduledLocationId?: string;
    available: boolean;
    unavailableReason?: string;
  };
  awareness?: {
    hasMet: boolean;
    lastInteractionTurn?: number;
    interactionCount?: number;
    reputation?: number;
  };
  mood?: {
    primary: string;
    intensity?: number;
  };
}

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

  /** Affinity states for all NPCs in this session (keyed by NPC ID) */
  affinityStates: Map<string, CharacterInstanceAffinity>;

  /** NPC location states for all NPCs in this session (keyed by NPC ID) */
  npcLocationStates: Map<string, NpcLocationState>;

  /** Current player location ID (extracted from location state) */
  playerLocationId: string | undefined;

  /** NPC context for the active NPC (schedule, availability, awareness) */
  npcContext: NpcContextLocal | undefined;

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
 * Type guard to check if a value is a CharacterInstanceAffinity.
 */
function isCharacterInstanceAffinity(value: unknown): value is CharacterInstanceAffinity {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Check required fields exist using bracket notation
  if (!obj['scores'] || typeof obj['scores'] !== 'object') return false;
  if (typeof obj['lastUpdated'] !== 'string') return false;
  if (!Array.isArray(obj['actionHistory'])) return false;
  if (!Array.isArray(obj['milestones'])) return false;
  if (typeof obj['relationshipLevel'] !== 'string') return false;

  // Check scores has required dimensions
  const scores = obj['scores'] as Record<string, unknown>;
  if (typeof scores['fondness'] !== 'number') return false;
  if (typeof scores['trust'] !== 'number') return false;
  if (typeof scores['respect'] !== 'number') return false;
  if (typeof scores['comfort'] !== 'number') return false;
  if (typeof scores['fear'] !== 'number') return false;

  return true;
}

/**
 * Type guard to check if a value is an NpcLocationState.
 */
function isNpcLocationState(value: unknown): value is NpcLocationState {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  // Check required fields exist using bracket notation
  if (typeof obj['locationId'] !== 'string') return false;
  if (!obj['activity'] || typeof obj['activity'] !== 'object') return false;
  if (!obj['arrivedAt'] || typeof obj['arrivedAt'] !== 'object') return false;
  if (typeof obj['interruptible'] !== 'boolean') return false;

  // Check activity has required fields
  const activity = obj['activity'] as Record<string, unknown>;
  if (typeof activity['type'] !== 'string') return false;
  if (typeof activity['description'] !== 'string') return false;
  if (typeof activity['engagement'] !== 'string') return false;

  // Check arrivedAt has required GameTime fields
  const arrivedAt = obj['arrivedAt'] as Record<string, unknown>;
  if (typeof arrivedAt['hour'] !== 'number') return false;
  if (typeof arrivedAt['minute'] !== 'number') return false;
  if (typeof arrivedAt['absoluteDay'] !== 'number') return false;

  return true;
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
  const [storedLocation, storedInventory, storedTime, storedAffinity, storedNpcLocations] =
    await Promise.all([
      getLocationState(sessionId),
      getInventoryState(sessionId),
      getTimeState(sessionId),
      getAllAffinityStates(sessionId),
      getAllNpcLocationStates(sessionId),
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

  // Convert affinity states from DB format to typed Map
  const affinityStates = new Map<string, CharacterInstanceAffinity>();
  for (const [npcId, state] of storedAffinity.entries()) {
    // Validate and cast the stored state to CharacterInstanceAffinity
    // The state is stored as a JSON blob, so we need to ensure it has the right shape
    if (isCharacterInstanceAffinity(state)) {
      affinityStates.set(npcId, state);
    }
  }

  // Convert NPC location states from DB format to typed Map
  const npcLocationStates = new Map<string, NpcLocationState>();
  for (const [npcId, record] of storedNpcLocations.entries()) {
    // Build the NpcLocationState from the DB record
    const state: NpcLocationState = {
      locationId: record.locationId,
      subLocationId: record.subLocationId ?? undefined,
      activity: record.activityJson as NpcLocationState['activity'],
      arrivedAt: record.arrivedAtJson as NpcLocationState['arrivedAt'],
      interruptible: record.interruptible,
      scheduleSlotId: record.scheduleSlotId ?? undefined,
    };

    // Validate the reconstructed state
    if (isNpcLocationState(state)) {
      npcLocationStates.set(npcId, state);
    }
  }

  // Extract player location ID from location state
  const playerLocationId =
    typeof locationBaseline['playerLocationId'] === 'string'
      ? locationBaseline['playerLocationId']
      : typeof locationBaseline['currentLocationId'] === 'string'
        ? locationBaseline['currentLocationId']
        : undefined;

  // Build NPC context if we have an active NPC that's different from primary
  let npcContext: NpcContextLocal | undefined;
  if (!npcIsPrimary && activeNpc) {
    npcContext = buildNpcContext(
      activeNpc,
      activeNpcBaseline,
      timeBaseline,
      affinityStates.get(activeNpc.id),
      npcLocationStates.get(activeNpc.id)
    );
  }

  // Add npcContext and npcLocations to baseline for governor access
  // Only set npcContext if we have one (due to exactOptionalPropertyTypes)
  if (npcContext) {
    baseline['npcContext'] = npcContext;
  }
  baseline['npcLocations'] = Object.fromEntries(npcLocationStates);
  if (playerLocationId !== undefined) {
    baseline['playerLocationId'] = playerLocationId;
  }
  baseline['affinity'] = Object.fromEntries(affinityStates);

  return {
    baseline,
    overrides,
    sessionState: {
      proximity,
      dialogue,
    },
    affinityStates,
    npcLocationStates,
    playerLocationId,
    npcContext,
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
// NPC Context Building
// =============================================================================

/**
 * Build NPC context for the active NPC.
 * Includes schedule resolution, availability, and awareness information.
 */
function buildNpcContext(
  npcInstance: CharacterInstanceRow,
  npcProfile: CharacterProfile,
  timeState: Record<string, unknown>,
  affinityState: CharacterInstanceAffinity | undefined,
  locationState: NpcLocationState | undefined
): NpcContextLocal {
  const context: NpcContextLocal = {};

  // Extract current game time from time state
  const currentTime = extractGameTime(timeState);

  // Build schedule data if NPC has a schedule
  // Cast to Record to access optional schedule fields that may not be in the base CharacterProfile type
  const profileRecord = npcProfile as unknown as Record<string, unknown>;
  const hasSchedule = profileRecord['schedule'] || profileRecord['scheduleRef'];

  if (hasSchedule) {
    // Build scheduleData only with properties that have values (not undefined)
    // to satisfy exactOptionalPropertyTypes
    const scheduleData: NpcScheduleData = {
      npcId: npcInstance.id,
    };

    const schedule = profileRecord['schedule'] as NpcSchedule | undefined;
    const scheduleRef = profileRecord['scheduleRef'] as NpcScheduleRef | undefined;
    const homeLocationId = profileRecord['homeLocationId'] as string | undefined;
    const workLocationId = profileRecord['workLocationId'] as string | undefined;

    if (schedule) scheduleData.schedule = schedule;
    if (scheduleRef) scheduleData.scheduleRef = scheduleRef;
    if (homeLocationId) scheduleData.homeLocationId = homeLocationId;
    if (workLocationId) scheduleData.workLocationId = workLocationId;

    if (currentTime) {
      const availability = checkNpcAvailability(scheduleData, { currentTime });

      // Build schedule context only with properties that have values
      const scheduleContext: NonNullable<NpcContextLocal['schedule']> = {
        available: availability.available,
      };

      if (availability.activity?.description) {
        scheduleContext.activity = availability.activity.description;
      }
      if (availability.locationId) {
        scheduleContext.scheduledLocationId = availability.locationId;
      }
      if (!availability.available && availability.reason) {
        scheduleContext.unavailableReason = availability.reason;
      }

      context.schedule = scheduleContext;
    }
  }

  // Build awareness context from affinity state
  if (affinityState) {
    const interactionCount = affinityState.actionHistory.reduce((sum, h) => sum + h.count, 0);

    context.awareness = {
      hasMet: interactionCount > 0,
      interactionCount,
      // Reputation could be derived from disposition level
      reputation: dispositionToReputation(affinityState.relationshipLevel),
    };
  } else {
    context.awareness = {
      hasMet: false,
      interactionCount: 0,
    };
  }

  // Build mood from location state activity
  if (locationState) {
    const engagement = locationState.activity.engagement;
    context.mood = {
      primary: engagementToMood(engagement),
      intensity: engagementToIntensity(engagement),
    };
  }

  return context;
}

/**
 * Extract GameTime from time state record.
 * Returns a partial GameTime with just the fields needed for schedule resolution.
 */
function extractGameTime(timeState: Record<string, unknown>): GameTime | null {
  const current = timeState['current'];
  if (!current || typeof current !== 'object') return null;

  const c = current as Record<string, unknown>;
  if (
    typeof c['hour'] !== 'number' ||
    typeof c['minute'] !== 'number' ||
    typeof c['absoluteDay'] !== 'number'
  ) {
    return null;
  }

  // Return a full GameTime object with defaults for missing fields
  return {
    year: typeof c['year'] === 'number' ? c['year'] : 1,
    month: typeof c['month'] === 'number' ? c['month'] : 1,
    dayOfMonth: typeof c['dayOfMonth'] === 'number' ? c['dayOfMonth'] : 1,
    absoluteDay: c['absoluteDay'],
    hour: c['hour'],
    minute: c['minute'],
    second: typeof c['second'] === 'number' ? c['second'] : 0,
  };
}

/**
 * Convert disposition level to a numeric reputation value.
 */
function dispositionToReputation(level: string): number {
  switch (level) {
    case 'devoted':
      return 100;
    case 'close':
      return 75;
    case 'friendly':
      return 50;
    case 'neutral':
      return 0;
    case 'unfriendly':
      return -50;
    case 'hostile':
      return -100;
    default:
      return 0;
  }
}

/**
 * Convert activity engagement to a mood string.
 */
function engagementToMood(engagement: string): string {
  switch (engagement) {
    case 'absorbed':
      return 'focused';
    case 'engaged':
      return 'attentive';
    case 'casual':
      return 'relaxed';
    case 'distracted':
      return 'preoccupied';
    default:
      return 'neutral';
  }
}

/**
 * Convert activity engagement to mood intensity.
 */
function engagementToIntensity(engagement: string): number {
  switch (engagement) {
    case 'absorbed':
      return 0.9;
    case 'engaged':
      return 0.7;
    case 'casual':
      return 0.4;
    case 'distracted':
      return 0.3;
    default:
      return 0.5;
  }
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
