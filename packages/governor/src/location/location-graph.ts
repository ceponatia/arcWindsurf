/**
 * Location Graph Service
 *
 * Stateless service for location graph operations.
 * Transforms LocationMap (nodes + connections + ports) into runtime-usable formats.
 *
 * Follows the ProximityManager pattern - static methods, no instance state.
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
 * This is the bridge between rich LocationMap and the executor's expectations.
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
 * Combines data from LocationConnection, LocationPort, and destination LocationNode.
 */
export interface ResolvedExit {
  /** Port ID on the source location */
  portId: string;
  /** Display name (from port or connection label) */
  name: string;
  /** Direction hint (north, up, etc.) if defined on the port */
  direction?: string;
  /** Destination location ID */
  destinationId: string;
  /** Destination location name */
  destinationName: string;
  /** Travel time in minutes (from connection) */
  travelMinutes: number;
  /** Whether the exit is locked */
  locked: boolean;
  /** Lock reason (if locked) */
  lockReason?: string;
  /** Connection ID for state updates */
  connectionId: string;
}

/**
 * Result of pathfinding between two locations.
 */
export interface PathResult {
  /** Whether destination is reachable */
  reachable: boolean;
  /** Ordered list of location IDs from source to destination (inclusive) */
  path: string[];
  /** Total travel time in minutes */
  totalTravelMinutes: number;
  /** Human-readable route description */
  routeDescription: string;
}

/**
 * Result of resolving a direction to an exit.
 */
export interface DirectionResolution {
  /** Whether an exit was found for the direction */
  found: boolean;
  /** The resolved exit (if found) */
  exit?: ResolvedExit;
  /** Alternative exits if exact match not found */
  alternatives?: ResolvedExit[];
  /** Error message (if not found) */
  error?: string;
}

/**
 * Result of checking reachability.
 */
export interface ReachabilityResult {
  /** Whether destination is directly reachable (one step) */
  reachable: boolean;
  /** The exit to use (if reachable) */
  exit?: ResolvedExit;
  /** Reason not reachable (if applicable) */
  reason?: string;
}

// =============================================================================
// LocationGraphService
// =============================================================================

/**
 * Stateless service for location graph operations.
 *
 * Key responsibilities:
 * 1. Build efficient lookup structures from LocationMap
 * 2. Resolve exits for any location (including port names, directions)
 * 3. Validate paths (is destination reachable from current location?)
 * 4. Map direction strings to specific exits
 * 5. Bridge between rich schema and flat runtime formats
 */
export class LocationGraphService {
  // ===========================================================================
  // Index Building
  // ===========================================================================

  /**
   * Build a lookup map of location nodes for fast access.
   */
  static buildNodeIndex(map: LocationMap): Map<string, LocationNode> {
    return new Map(map.nodes.map((n) => [n.id, n]));
  }

  /**
   * Build an adjacency list from connections for graph traversal.
   * Key: locationId, Value: array of connection objects going out from that location
   */
  static buildAdjacencyList(
    map: LocationMap
  ): Map<string, { connection: LocationConnection; isReverse: boolean }[]> {
    const adjacency = new Map<string, { connection: LocationConnection; isReverse: boolean }[]>();

    // Initialize all nodes with empty arrays
    for (const node of map.nodes) {
      adjacency.set(node.id, []);
    }

    // Add connections
    for (const conn of map.connections) {
      // Forward direction
      const fromList = adjacency.get(conn.fromLocationId);
      if (fromList) {
        fromList.push({ connection: conn, isReverse: false });
      }

      // Reverse direction (if bidirectional)
      if (conn.bidirectional) {
        const toList = adjacency.get(conn.toLocationId);
        if (toList) {
          toList.push({ connection: conn, isReverse: true });
        }
      }
    }

    return adjacency;
  }

  // ===========================================================================
  // Exit Resolution
  // ===========================================================================

  /**
   * Get all resolved exits from a location.
   * Transforms connections + ports into user-friendly exit info.
   *
   * @param map - The location map
   * @param locationId - The source location ID
   * @param includeLockedExits - Whether to include locked exits (default: true)
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

      // Check if this connection starts from our location
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
      // Check bidirectional connections (reverse direction)
      else if (conn.bidirectional && conn.toLocationId === locationId) {
        const destNode = nodeIndex.get(conn.fromLocationId);
        // For reverse direction, use the toPort as our exit port
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
   * Resolve a direction (north, up, through the door, etc.) to a specific exit.
   * Matches against:
   * 1. Port direction (exact match)
   * 2. Port name (contains direction)
   * 3. Destination name (contains direction)
   * 4. Exit name/label (contains direction)
   */
  static resolveDirection(
    map: LocationMap,
    locationId: string,
    direction: string
  ): DirectionResolution {
    const exits = this.getExitsForLocation(map, locationId, false); // Exclude locked
    const normalizedDir = direction.toLowerCase().trim();

    // Priority 1: Exact direction match on port
    const exactMatch = exits.find((e) => e.direction?.toLowerCase() === normalizedDir);
    if (exactMatch) {
      return { found: true, exit: exactMatch };
    }

    // Priority 2: Port/exit name contains direction
    const nameMatch = exits.find((e) => e.name.toLowerCase().includes(normalizedDir));
    if (nameMatch) {
      return { found: true, exit: nameMatch };
    }

    // Priority 3: Destination name contains direction (fuzzy)
    const destMatch = exits.find((e) => e.destinationName.toLowerCase().includes(normalizedDir));
    if (destMatch) {
      return { found: true, exit: destMatch };
    }

    // Priority 4: Direction contains exit direction (reverse match)
    // e.g., "go to the north gate" matches exit with direction "north"
    const reverseMatch = exits.find(
      (e) => e.direction && normalizedDir.includes(e.direction.toLowerCase())
    );
    if (reverseMatch) {
      return { found: true, exit: reverseMatch };
    }

    // No match - return alternatives
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

    // Try exact ID match first
    const idMatch = exits.find((e) => e.destinationId === destination);
    if (idMatch) {
      return { found: true, exit: idMatch };
    }

    // Try destination name match
    const nameMatch = exits.find((e) => e.destinationName.toLowerCase() === normalizedDest);
    if (nameMatch) {
      return { found: true, exit: nameMatch };
    }

    // Try partial name match
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

  // ===========================================================================
  // Reachability & Pathfinding
  // ===========================================================================

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
   * Returns the shortest path (fewest hops).
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

    // BFS
    const visited = new Set<string>();
    const queue: { locationId: string; path: string[]; travelTime: number }[] = [
      { locationId: fromLocationId, path: [fromLocationId], travelTime: 0 },
    ];

    visited.add(fromLocationId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current.locationId) ?? [];

      for (const { connection, isReverse } of neighbors) {
        // Skip locked connections
        if (connection.locked) continue;

        const nextLocationId = isReverse ? connection.fromLocationId : connection.toLocationId;

        if (visited.has(nextLocationId)) continue;
        visited.add(nextLocationId);

        const newPath = [...current.path, nextLocationId];
        const newTravelTime = current.travelTime + (connection.travelMinutes ?? 5);

        if (nextLocationId === toLocationId) {
          // Build route description
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

    // No path found
    return {
      reachable: false,
      path: [],
      totalTravelMinutes: 0,
      routeDescription: 'No path available.',
    };
  }

  // ===========================================================================
  // Format Conversion
  // ===========================================================================

  /**
   * Build flat LocationInfo map for ToolExecutor.
   * This bridges the rich LocationMap schema to the executor's simpler expectations.
   */
  static buildLocationInfoMap(map: LocationMap): Map<string, LocationInfo> {
    const result = new Map<string, LocationInfo>();

    for (const node of map.nodes) {
      const exits = this.getExitsForLocation(map, node.id, false); // Exclude locked

      const info: LocationInfo = {
        id: node.id,
        name: node.name,
        exits: exits.map((e) => ({
          direction: e.direction ?? e.name,
          destinationId: e.destinationId,
          destinationName: e.destinationName,
        })),
      };

      // Add description if present (exactOptionalPropertyTypes)
      const desc = node.description ?? node.summary;
      if (desc !== undefined) {
        info.description = desc;
      }

      // Add capacity from node properties if present
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
   * Returns human-readable exit descriptions.
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

  // ===========================================================================
  // Location Lookup Helpers
  // ===========================================================================

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
   * Get all locations at a specific depth level (for semantic zoom).
   */
  static getLocationsByDepth(map: LocationMap, depth: number): LocationNode[] {
    return map.nodes.filter((n) => n.depth === depth);
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
    // Fallback to first node if no default set
    return map.nodes[0];
  }
}
