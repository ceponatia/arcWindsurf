/**
 * Location Service
 *
 * Stateless service for location graph operations.
 * Transforms LocationMap (nodes + connections + ports) into runtime-usable formats.
 *
 * @see dev-docs/schemas/05-locations-schema.md
 * @see packages/schemas/src/location/locationMap.ts
 */
import type { LocationMap, LocationNode, LocationConnection } from '@minimal-rpg/schemas';

// =============================================================================
// Types
// =============================================================================

/**
 * Simplified location info for ToolExecutor.
 */
export interface LocationInfo {
  id: string;
  name: string;
  description?: string;
  exits?: {
    direction: string;
    destinationId: string;
    destinationName?: string;
  }[];
  capacity?: number;
  travelTimeMinutes?: number;
}

/**
 * Resolved exit from a location with all contextual info.
 */
export interface ResolvedExit {
  portId: string;
  name: string;
  direction?: string;
  destinationId: string;
  destinationName: string;
  travelMinutes: number;
  locked: boolean;
  lockReason?: string;
  connectionId: string;
}

/**
 * Result of pathfinding between two locations.
 */
export interface PathResult {
  reachable: boolean;
  path: string[];
  totalTravelMinutes: number;
  routeDescription: string;
}

/**
 * Result of resolving a direction to an exit.
 */
export interface DirectionResolution {
  found: boolean;
  exit?: ResolvedExit;
  alternatives?: ResolvedExit[];
  error?: string;
}

/**
 * Result of checking reachability.
 */
export interface ReachabilityResult {
  reachable: boolean;
  exit?: ResolvedExit;
  reason?: string;
}

/**
 * LocationService
 *
 * Stateless service for location graph operations.
 */
export class LocationService {
  /**
   * Build a lookup map of location nodes for fast access.
   */
  static buildNodeIndex(map: LocationMap): Map<string, LocationNode> {
    return new Map(map.nodes.map((n) => [n.id, n]));
  }

  /**
   * Build an adjacency list from connections for graph traversal.
   */
  static buildAdjacencyList(
    map: LocationMap
  ): Map<string, { connection: LocationConnection; isReverse: boolean }[]> {
    const adjacency = new Map<string, { connection: LocationConnection; isReverse: boolean }[]>();

    for (const node of map.nodes) {
      adjacency.set(node.id, []);
    }

    for (const conn of map.connections) {
      const fromList = adjacency.get(conn.fromLocationId);
      if (fromList) {
        fromList.push({ connection: conn, isReverse: false });
      }

      if (conn.bidirectional) {
        const toList = adjacency.get(conn.toLocationId);
        if (toList) {
          toList.push({ connection: conn, isReverse: true });
        }
      }
    }

    return adjacency;
  }

  /**
   * Get all resolved exits from a location.
   */
  static getExitsForLocation(
    map: LocationMap,
    locationId: string,
    includeLockedExits = true
  ): ResolvedExit[] {
    const nodeIndex = this.buildNodeIndex(map);
    const sourceNode = nodeIndex.get(locationId);
    if (!sourceNode) return [];

    const exits: ResolvedExit[] = [];
    const makeExit = (conn: LocationConnection, useReverse: boolean): ResolvedExit | null => {
      const destinationId = useReverse ? conn.fromLocationId : conn.toLocationId;
      const portId = useReverse ? conn.toPortId : conn.fromPortId;
      const destNode = nodeIndex.get(destinationId);
      const sourcePort = sourceNode.ports.find((p) => p.id === portId);

      const baseExit: ResolvedExit = {
        portId,
        name: sourcePort?.name ?? conn.label ?? 'exit',
        destinationId,
        destinationName: destNode?.name ?? 'unknown',
        travelMinutes: conn.travelMinutes ?? 5,
        locked: conn.locked ?? false,
        connectionId: conn.id,
      };

      if (sourcePort?.direction !== undefined) {
        baseExit.direction = sourcePort.direction;
      }
      if (conn.lockReason !== undefined) {
        baseExit.lockReason = conn.lockReason;
      }

      return baseExit;
    };

    for (const conn of map.connections) {
      let exit: ResolvedExit | null = null;

      if (conn.fromLocationId === locationId) {
        exit = makeExit(conn, false);
      }
      else if (conn.bidirectional && conn.toLocationId === locationId) {
        exit = makeExit(conn, true);
      }

      if (exit && (includeLockedExits || !exit.locked)) {
        exits.push(exit);
      }
    }

    return exits;
  }

  /**
   * Resolve a direction to a specific exit.
   */
  static resolveDirection(
    map: LocationMap,
    locationId: string,
    direction: string
  ): DirectionResolution {
    const exits = this.getExitsForLocation(map, locationId, false);
    const normalizedDir = direction.toLowerCase().trim();

    const exactMatch = exits.find((e) => e.direction?.toLowerCase() === normalizedDir);
    if (exactMatch) {
      return { found: true, exit: exactMatch };
    }

    const nameMatch = exits.find((e) => e.name.toLowerCase().includes(normalizedDir));
    if (nameMatch) {
      return { found: true, exit: nameMatch };
    }

    const destMatch = exits.find((e) => e.destinationName.toLowerCase().includes(normalizedDir));
    if (destMatch) {
      return { found: true, exit: destMatch };
    }

    const reverseMatch = exits.find(
      (e) => e.direction && normalizedDir.includes(e.direction.toLowerCase())
    );
    if (reverseMatch) {
      return { found: true, exit: reverseMatch };
    }

    const availableDirections = exits
      .map((e) => e.direction ?? e.name)
      .filter((d) => d)
      .join(', ');

    return {
      found: false,
      alternatives: exits,
      error: `No exit "${direction}" found. Available: ${availableDirections || 'none'}`,
    };
  }

  /**
   * Resolve a destination by ID or name.
   */
  static resolveDestination(
    map: LocationMap,
    locationId: string,
    destination: string
  ): DirectionResolution {
    const exits = this.getExitsForLocation(map, locationId, false);
    const normalizedDest = destination.toLowerCase().trim();

    const idMatch = exits.find((e) => e.destinationId === destination);
    if (idMatch) {
      return { found: true, exit: idMatch };
    }

    const nameMatch = exits.find((e) => e.destinationName.toLowerCase() === normalizedDest);
    if (nameMatch) {
      return { found: true, exit: nameMatch };
    }

    const partialMatch = exits.find((e) =>
      e.destinationName.toLowerCase().includes(normalizedDest)
    );
    if (partialMatch) {
      return { found: true, exit: partialMatch };
    }

    return {
      found: false,
      alternatives: exits,
      error: `Destination "${destination}" not directly reachable from here.`,
    };
  }

  /**
   * Check if destination is directly reachable (one step) from current location.
   */
  static canReachDirectly(
    map: LocationMap,
    fromLocationId: string,
    toLocationId: string
  ): ReachabilityResult {
    const exits = this.getExitsForLocation(map, fromLocationId, true);
    const exit = exits.find((e) => e.destinationId === toLocationId);

    if (!exit) {
      return {
        reachable: false,
        reason: `No direct connection to ${toLocationId}`,
      };
    }

    if (exit.locked) {
      return {
        reachable: false,
        exit,
        reason: exit.lockReason ?? 'Exit is locked',
      };
    }

    return { reachable: true, exit };
  }

  /**
   * Find a path between two locations using BFS.
   */
  static findPath(map: LocationMap, fromLocationId: string, toLocationId: string): PathResult {
    if (fromLocationId === toLocationId) {
      return {
        reachable: true,
        path: [fromLocationId],
        totalTravelMinutes: 0,
        routeDescription: 'You are already there.',
      };
    }

    const nodeIndex = this.buildNodeIndex(map);
    const adjacency = this.buildAdjacencyList(map);

    const visited = new Set<string>();
    const queue: { locationId: string; path: string[]; travelTime: number }[] = [
      { locationId: fromLocationId, path: [fromLocationId], travelTime: 0 },
    ];

    visited.add(fromLocationId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current.locationId) ?? [];

      for (const { connection, isReverse } of neighbors) {
        if (connection.locked) continue;

        const nextLocationId = isReverse ? connection.fromLocationId : connection.toLocationId;

        if (visited.has(nextLocationId)) continue;
        visited.add(nextLocationId);

        const newPath = [...current.path, nextLocationId];
        const newTravelTime = current.travelTime + (connection.travelMinutes ?? 5);

        if (nextLocationId === toLocationId) {
          const routeSteps = newPath.map((id) => nodeIndex.get(id)?.name ?? id);
          return {
            reachable: true,
            path: newPath,
            totalTravelMinutes: newTravelTime,
            routeDescription: routeSteps.join(' → '),
          };
        }

        queue.push({
          locationId: nextLocationId,
          path: newPath,
          travelTime: newTravelTime,
        });
      }
    }

    return {
      reachable: false,
      path: [],
      totalTravelMinutes: 0,
      routeDescription: 'No path available.',
    };
  }

  /**
   * Build flat LocationInfo map for ToolExecutor.
   */
  static buildLocationInfoMap(map: LocationMap): Map<string, LocationInfo> {
    const result = new Map<string, LocationInfo>();

    for (const node of map.nodes) {
      const exits = this.getExitsForLocation(map, node.id, false);

      const info: LocationInfo = {
        id: node.id,
        name: node.name,
        exits: exits.map((e) => ({
          direction: e.direction ?? e.name,
          destinationId: e.destinationId,
          destinationName: e.destinationName,
        })),
      };

      const desc = node.description ?? node.summary;
      if (desc !== undefined) {
        info.description = desc;
      }

      const props = node.properties;
      if (props !== undefined && 'capacity' in props && typeof props['capacity'] === 'number') {
        info.capacity = props['capacity'];
      }

      result.set(node.id, info);
    }

    return result;
  }

  /**
   * Format exits for LLM system prompt context.
   */
  static formatExitsForPrompt(exits: ResolvedExit[]): string {
    if (exits.length === 0) {
      return 'No exits available.';
    }

    return exits
      .map((e) => {
        const dir = e.direction ? `[${e.direction}] ` : '';
        const lock = e.locked ? ' (LOCKED)' : '';
        const time = e.travelMinutes > 0 ? ` (~${e.travelMinutes} min)` : '';
        return `• ${dir}${e.name} → ${e.destinationName}${time}${lock}`;
      })
      .join('\n');
  }

  /**
   * Format exits as a simple direction list for quick reference.
   */
  static formatExitDirections(exits: ResolvedExit[]): string {
    const unlocked = exits.filter((e) => !e.locked);
    if (unlocked.length === 0) return 'No exits available.';

    return unlocked.map((e) => e.direction ?? e.name).join(', ');
  }

  /**
   * Get a location node by ID.
   */
  static getLocation(map: LocationMap, locationId: string): LocationNode | undefined {
    return map.nodes.find((n) => n.id === locationId);
  }

  /**
   * Get a location node by name (case-insensitive).
   */
  static getLocationByName(map: LocationMap, name: string): LocationNode | undefined {
    const normalizedName = name.toLowerCase().trim();
    return map.nodes.find((n) => n.name.toLowerCase() === normalizedName);
  }

  /**
   * Find locations by partial name match.
   */
  static searchLocations(map: LocationMap, query: string): LocationNode[] {
    const normalizedQuery = query.toLowerCase().trim();
    return map.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(normalizedQuery) ||
        (n.summary?.toLowerCase().includes(normalizedQuery) ?? false) ||
        (n.description?.toLowerCase().includes(normalizedQuery) ?? false)
    );
  }

  /**
   * Get child locations of a parent.
   */
  static getChildLocations(map: LocationMap, parentId: string): LocationNode[] {
    return map.nodes.filter((n) => n.parentId === parentId);
  }

  /**
   * Get the default start location for a map.
   */
  static getDefaultStartLocation(map: LocationMap): LocationNode | undefined {
    if (map.defaultStartLocationId) {
      return this.getLocation(map, map.defaultStartLocationId);
    }
    return map.nodes[0];
  }
}
