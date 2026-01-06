/**
 * Location Graph Service
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
 * LocationGraphService
 * 
 * Stateless service for location graph operations.
 */
export class LocationGraphService {
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

    for (const conn of map.connections) {
      let exit: ResolvedExit | null = null;

      if (conn.fromLocationId === locationId) {
        const destNode = nodeIndex.get(conn.toLocationId);
        const sourcePort = sourceNode.ports.find((p) => p.id === conn.fromPortId);

        const baseExit: ResolvedExit = {
          portId: conn.fromPortId,
          name: sourcePort?.name ?? conn.label ?? 'exit',
          destinationId: conn.toLocationId,
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
        exit = baseExit;
      }
      else if (conn.bidirectional && conn.toLocationId === locationId) {
        const destNode = nodeIndex.get(conn.fromLocationId);
        const sourcePort = sourceNode.ports.find((p) => p.id === conn.toPortId);

        const baseExit: ResolvedExit = {
          portId: conn.toPortId,
          name: sourcePort?.name ?? conn.label ?? 'exit',
          destinationId: conn.fromLocationId,
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
        exit = baseExit;
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
}
