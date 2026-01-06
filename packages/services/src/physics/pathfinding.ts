import { LocationService } from '../location/location-service';
import type { LocationMap } from '@minimal-rpg/schemas';

/**
 * Pathfinding Service
 *
 * Implements A* and BFS navigation algorithms for the world graph.
 */
export class PathfindingService {
  /**
   * Find the shortest path between two locations using BFS.
   * This is a wrapper around LocationService.findPath.
   */
  static findShortestPath(map: LocationMap, fromId: string, toId: string) {
    return LocationService.findPath(map, fromId, toId);
  }

  /**
   * Get all reachable locations from a starting point within a certain distance/time.
   */
  static getReachableLocations(map: LocationMap, fromId: string, maxTravelMinutes: number) {
    const nodeIndex = LocationService.buildNodeIndex(map);
    const adjacency = LocationService.buildAdjacencyList(map);
    
    const reachable = new Map<string, number>();
    const queue: { id: string; time: number }[] = [{ id: fromId, time: 0 }];
    
    reachable.set(fromId, 0);

    while (queue.length > 0) {
      const { id, time } = queue.shift()!;
      const neighbors = adjacency.get(id) ?? [];

      for (const { connection, isReverse } of neighbors) {
        if (connection.locked) continue;

        const nextId = isReverse ? connection.fromLocationId : connection.toLocationId;
        const nextTime = time + (connection.travelMinutes ?? 5);

        if (nextTime <= maxTravelMinutes) {
          if (!reachable.has(nextId) || nextTime < reachable.get(nextId)!) {
            reachable.set(nextId, nextTime);
            queue.push({ id: nextId, time: nextTime });
          }
        }
      }
    }

    return Array.from(reachable.entries()).map(([id, time]) => ({
      id,
      name: nodeIndex.get(id)?.name ?? id,
      travelMinutes: time
    }));
  }
}
