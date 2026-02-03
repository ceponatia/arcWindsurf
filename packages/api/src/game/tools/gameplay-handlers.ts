/**
 * Gameplay tool handlers - execute tool calls that change game state.
 */
import type { ToolResult } from './types.js';
import type { InventoryItem, LocationMap, LocationNode } from '@minimal-rpg/schemas';
import {
  InventoryStateSchema,
  LocationConnectionSchema,
  LocationNodeSchema,
} from '@minimal-rpg/schemas';
import {
  getActorState,
  getActorsAtLocation,
  getInventoryItems,
  getLocationMap,
  getSession,
  getSessionProjection,
  LocationDataValidationError,
  listActorStatesForSession,
  updateActorState,
  upsertProjection,
} from '@minimal-rpg/db/node';
import { worldBus } from '@minimal-rpg/bus';
import { LocationService } from '@minimal-rpg/services';
import { toSessionId } from '../../utils/uuid.js';
import {
  ExamineObjectArgsSchema,
  NavigatePlayerArgsSchema,
  UseItemArgsSchema,
} from './tool-args.js';

export interface GameplayToolContext {
  /** Owner key for tenancy scoping */
  ownerEmail: string;
  /** Current session ID */
  sessionId: string;
}

interface PlayerContext {
  actorId: string;
  locationId: string | null;
}

interface ExamineMatch {
  kind: 'location' | 'actor' | 'item';
  label: string;
  description: string;
}

/**
 * Handle examine_object tool call.
 */
export async function handleExamineObject(
  args: unknown,
  context: GameplayToolContext
): Promise<ToolResult> {
  const parsedArgs = ExamineObjectArgsSchema.safeParse(args);
  if (!parsedArgs.success) {
    return { success: false, error: 'Invalid arguments for examine_object.' };
  }

  const target = parsedArgs.data.target.trim();
  if (!target) {
    return { success: false, error: 'Target is required for examine_object.' };
  }

  try {
    const player = await loadPlayerContext(context);
    const locationMap = await loadSessionLocationMap(context);

    const match = await resolveExamineTarget(target, player, locationMap, context);
    if (!match) {
      return {
        success: false,
        error: `Cannot find "${target}" to examine.`,
      };
    }

    await worldBus.emit({
      type: 'OBJECT_EXAMINED',
      actorId: player.actorId,
      target: match.label,
      ...(parsedArgs.data.focus ? { focus: parsedArgs.data.focus } : {}),
      ...(player.locationId ? { locationId: player.locationId } : {}),
      sessionId: context.sessionId,
      timestamp: new Date(),
    });

    return {
      success: true,
      target: match.label,
      kind: match.kind,
      description: match.description,
      ...(parsedArgs.data.focus ? { focus: parsedArgs.data.focus } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to examine target: ${message}`,
    };
  }
}

/**
 * Handle navigate_player tool call.
 */
export async function handleNavigatePlayer(
  args: unknown,
  context: GameplayToolContext
): Promise<ToolResult> {
  const parsedArgs = NavigatePlayerArgsSchema.safeParse(args ?? {});
  if (!parsedArgs.success) {
    return { success: false, error: 'Invalid arguments for navigate_player.' };
  }

  try {
    const player = await loadPlayerContext(context);
    if (!player.locationId) {
      return {
        success: false,
        error: 'Current location is unknown. Cannot navigate.',
      };
    }

    const locationMap = await loadSessionLocationMap(context);
    if (!locationMap) {
      return {
        success: false,
        error: 'No location map configured for this session.',
      };
    }

    const exits = LocationService.getExitsForLocation(locationMap, player.locationId, true);

    if (parsedArgs.data.describe_only) {
      return {
        success: true,
        describe_only: true,
        locationId: player.locationId,
        exits: exits.map((exit) => ({
          direction: exit.direction ?? exit.name,
          destinationId: exit.destinationId,
          destinationName: exit.destinationName,
          locked: exit.locked,
          lockReason: exit.lockReason,
        })),
        narrative: LocationService.formatExitsForPrompt(exits),
      };
    }

    const direction = parsedArgs.data.direction?.trim();
    const destination = parsedArgs.data.destination?.trim();

    if (!direction && !destination) {
      return {
        success: false,
        error: 'Provide a direction or destination to navigate.',
        suggestion: LocationService.formatExitDirections(exits),
      };
    }

    const resolution = destination
      ? LocationService.resolveDestination(locationMap, player.locationId, destination)
      : LocationService.resolveDirection(locationMap, player.locationId, direction ?? '');

    if (!resolution.found || !resolution.exit) {
      return {
        success: false,
        error: resolution.error ?? 'No valid exit found.',
        suggestion: LocationService.formatExitDirections(exits),
      };
    }

    if (resolution.exit.locked) {
      return {
        success: false,
        error: resolution.exit.lockReason ?? 'That path is locked.',
      };
    }

    const destinationNode = LocationService.getLocation(locationMap, resolution.exit.destinationId);

    await updatePlayerLocation(context, player.actorId, resolution.exit.destinationId);

    await worldBus.emit({
      type: 'MOVED',
      actorId: player.actorId,
      fromLocationId: player.locationId,
      toLocationId: resolution.exit.destinationId,
      sessionId: context.sessionId,
      timestamp: new Date(),
    });

    return {
      success: true,
      previousLocation: player.locationId,
      newLocation: resolution.exit.destinationId,
      locationName: destinationNode?.name ?? resolution.exit.destinationName,
      description: destinationNode?.description ?? destinationNode?.summary ?? '',
      exit: {
        direction: resolution.exit.direction ?? resolution.exit.name,
        name: resolution.exit.name,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to navigate: ${message}`,
    };
  }
}

/**
 * Handle use_item tool call.
 */
export async function handleUseItem(
  args: unknown,
  context: GameplayToolContext
): Promise<ToolResult> {
  const parsedArgs = UseItemArgsSchema.safeParse(args);
  if (!parsedArgs.success) {
    return { success: false, error: 'Invalid arguments for use_item.' };
  }

  const itemName = parsedArgs.data.item_name.trim();
  if (!itemName) {
    return { success: false, error: 'Item name is required for use_item.' };
  }

  try {
    const player = await loadPlayerContext(context);
    const items = await getInventoryItems(toSessionId(context.sessionId), player.actorId);
    const item = matchInventoryItem(items, itemName);

    if (!item) {
      return {
        success: false,
        error: `You don't have "${itemName}" in your inventory.`,
      };
    }

    if (item.usable === false) {
      return {
        success: false,
        error: `${item.name} cannot be used that way.`,
      };
    }

    if (typeof item.quantity === 'number' && item.quantity <= 0) {
      return {
        success: false,
        error: `${item.name} is depleted.`,
      };
    }

    const remainingQuantity = await consumeInventoryItem(context.sessionId, item);

    await worldBus.emit({
      type: 'ITEM_USED',
      actorId: player.actorId,
      itemId: item.id,
      sessionId: context.sessionId,
      timestamp: new Date(),
    });

    return {
      success: true,
      item: item.name,
      itemId: item.id,
      target: parsedArgs.data.target ?? null,
      action: parsedArgs.data.action ?? null,
      remainingQuantity,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to use item: ${message}`,
    };
  }
}

/**
 * Load the player actor id and location id for the session.
 */
async function loadPlayerContext(context: GameplayToolContext): Promise<PlayerContext> {
  const sessionKey = toSessionId(context.sessionId);
  const actorRows = await listActorStatesForSession(sessionKey);
  const playerRow = actorRows.find((row) => row.actorType === 'player');
  const actorId = playerRow?.actorId ?? 'player';

  const actorState = await getActorState(sessionKey, actorId);
  const locationId = extractLocationId(actorState?.state);

  if (locationId) {
    return { actorId, locationId };
  }

  const projection = await getSessionProjection(sessionKey);
  const projectionLocationId = extractLocationId(projection?.location);

  return { actorId, locationId: projectionLocationId };
}

/**
 * Load and parse the session's location map.
 */
async function loadSessionLocationMap(
  context: GameplayToolContext
): Promise<LocationMap | null> {
  const sessionKey = toSessionId(context.sessionId);
  const session = await getSession(sessionKey, context.ownerEmail);
  if (!session?.locationMapId) return null;

  let mapRow: Awaited<ReturnType<typeof getLocationMap>>;

  try {
    mapRow = await getLocationMap(session.locationMapId);
  } catch (error) {
    if (error instanceof LocationDataValidationError) {
      console.error('[GameplayTools] Invalid location map data detected', error.details);
      return null;
    }
    throw error;
  }
  if (!mapRow) return null;

  const nodes = LocationNodeSchema.array().parse(mapRow.nodesJson ?? []);
  const connections = LocationConnectionSchema.array().parse(mapRow.connectionsJson ?? []);

  return {
    id: mapRow.id,
    name: mapRow.name,
    description: mapRow.description ?? undefined,
    settingId: mapRow.settingId ?? 'unknown',
    isTemplate: true,
    nodes,
    connections,
    defaultStartLocationId: mapRow.defaultStartLocationId ?? undefined,
    tags: mapRow.tags ?? [],
    createdAt: mapRow.createdAt?.toISOString(),
    updatedAt: mapRow.updatedAt?.toISOString(),
  };
}

/**
 * Resolve the target of an examination.
 */
async function resolveExamineTarget(
  target: string,
  player: PlayerContext,
  locationMap: LocationMap | null,
  context: GameplayToolContext
): Promise<ExamineMatch | null> {
  const normalizedTarget = normalizeValue(target);

  if (locationMap && player.locationId) {
    const currentLocation = LocationService.getLocation(locationMap, player.locationId);
    if (currentLocation && matchesCurrentLocation(normalizedTarget, currentLocation)) {
      return {
        kind: 'location',
        label: currentLocation.name,
        description: currentLocation.description ?? currentLocation.summary ?? 'No description available.',
      };
    }
  }

  const items = await getInventoryItems(toSessionId(context.sessionId), player.actorId);
  const inventoryMatch = matchInventoryItem(items, target);
  if (inventoryMatch) {
    return {
      kind: 'item',
      label: inventoryMatch.name,
      description: inventoryMatch.description ?? 'No description available.',
    };
  }

  if (player.locationId) {
    const actorsAtLocation = await getActorsAtLocation(
      toSessionId(context.sessionId),
      player.locationId
    );
    const actorIds = new Set(actorsAtLocation.map((actor) => actor.actorId));
    const actorRows = await listActorStatesForSession(toSessionId(context.sessionId));
    const actorMatch = actorRows
      .filter((actor) => actorIds.has(actor.actorId))
      .map((actor) => ({
        actorId: actor.actorId,
        state: actor.state,
        name: resolveActorDisplayName(actor.actorId, actor.state),
        description: resolveActorDescription(actor.state),
      }))
      .find((candidate) => matchesName(normalizedTarget, candidate.name ?? candidate.actorId));

    if (actorMatch) {
      return {
        kind: 'actor',
        label: actorMatch.name ?? actorMatch.actorId,
        description: actorMatch.description ?? 'No description available.',
      };
    }
  }

  if (locationMap) {
    const matches = LocationService.searchLocations(locationMap, target);
    const match = matches[0];
    if (match) {
      return {
        kind: 'location',
        label: match.name,
        description: match.description ?? match.summary ?? 'No description available.',
      };
    }
  }

  return null;
}

/**
 * Update player location in actor state and session projection.
 */
async function updatePlayerLocation(
  context: GameplayToolContext,
  actorId: string,
  destinationId: string
): Promise<void> {
  const sessionKey = toSessionId(context.sessionId);
  const updates = {
    location: { currentLocationId: destinationId },
    locationId: destinationId,
  };

  await updateActorState(sessionKey, actorId, updates);

  const projection = await getSessionProjection(sessionKey);
  const currentLocation = extractLocationId(projection?.location);
  const updatedLocation = {
    ...(isRecord(projection?.location) ? projection?.location : {}),
    currentLocationId: destinationId,
    ...(currentLocation ? { previousLocationId: currentLocation } : {}),
  };

  await upsertProjection(sessionKey, { location: updatedLocation });
}

/**
 * Consume a quantity of an inventory item when applicable.
 */
async function consumeInventoryItem(sessionId: string, item: InventoryItem): Promise<number | null> {
  if (typeof item.quantity !== 'number') {
    return null;
  }

  const sessionKey = toSessionId(sessionId);
  const projection = await getSessionProjection(sessionKey);
  const parsed = InventoryStateSchema.safeParse(projection?.inventory ?? {});
  const state = parsed.success ? parsed.data : { items: [] };

  const updatedItems = state.items
    .map((entry) => {
      if (entry.id !== item.id) return entry;
      const nextQuantity = Math.max(0, (entry.quantity ?? 0) - 1);
      return nextQuantity > 0 ? { ...entry, quantity: nextQuantity } : null;
    })
    .filter((entry): entry is InventoryItem => Boolean(entry));

  await upsertProjection(sessionKey, {
    inventory: {
      ...state,
      items: updatedItems,
    },
  });

  const updatedItem = updatedItems.find((entry) => entry.id === item.id);
  return updatedItem?.quantity ?? 0;
}

/**
 * Match an inventory item by id or name.
 */
function matchInventoryItem(items: InventoryItem[], query: string): InventoryItem | null {
  const normalizedQuery = normalizeValue(query);
  const exactMatch = items.find(
    (item) =>
      normalizeValue(item.id) === normalizedQuery ||
      normalizeValue(item.name) === normalizedQuery
  );

  if (exactMatch) return exactMatch;

  const partialMatch = items.find(
    (item) =>
      normalizeValue(item.name).includes(normalizedQuery) ||
      normalizedQuery.includes(normalizeValue(item.name))
  );

  return partialMatch ?? null;
}

/**
 * Normalize string input for comparisons.
 */
function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Check if a target refers to the current location.
 */
function matchesCurrentLocation(target: string, location: LocationNode): boolean {
  if (target === 'here' || target === 'this place' || target === 'this room') {
    return true;
  }
  return matchesName(target, location.name);
}

/**
 * Compare a normalized target against a candidate name.
 */
function matchesName(target: string, candidate: string): boolean {
  const normalizedCandidate = normalizeValue(candidate);
  return normalizedCandidate === target || normalizedCandidate.includes(target) || target.includes(normalizedCandidate);
}

/**
 * Resolve an actor display name from state.
 */
function resolveActorDisplayName(actorId: string, state: unknown): string | null {
  if (!isRecord(state)) return null;
  const nameValue = state['name'];
  if (typeof nameValue === 'string') return nameValue;

  const labelValue = state['label'];
  if (typeof labelValue === 'string') return labelValue;

  const profile = state['profile'];
  if (isRecord(profile) && typeof profile['name'] === 'string') {
    return profile['name'];
  }

  return actorId;
}

/**
 * Resolve a description from actor state/profile data.
 */
function resolveActorDescription(state: unknown): string | null {
  if (!isRecord(state)) return null;

  const profile = state['profile'];
  if (isRecord(profile) && typeof profile['description'] === 'string') {
    return profile['description'];
  }

  const profileJson = state['profileJson'];
  if (typeof profileJson === 'string') {
    const parsed = safeJsonParse(profileJson);
    if (isRecord(parsed) && typeof parsed['description'] === 'string') {
      return parsed['description'];
    }
  }

  return null;
}

/**
 * Safely parse JSON into an unknown value.
 */
function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/**
 * Extract a location id from stored state.
 */
function extractLocationId(state: unknown): string | null {
  if (!isRecord(state)) return null;

  const location = state['location'];
  if (isRecord(location) && typeof location['currentLocationId'] === 'string') {
    return location['currentLocationId'];
  }

  const locationState = state['locationState'];
  if (isRecord(locationState) && typeof locationState['locationId'] === 'string') {
    return locationState['locationId'];
  }

  const simulation = state['simulation'];
  if (isRecord(simulation)) {
    const currentState = simulation['currentState'];
    if (isRecord(currentState) && typeof currentState['locationId'] === 'string') {
      return currentState['locationId'];
    }
  }

  if (typeof state['locationId'] === 'string') {
    return state['locationId'];
  }

  return null;
}

/**
 * Check if a value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
