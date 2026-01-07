import { LocationService } from './location-service.js';
import type { LocationMap } from '@minimal-rpg/schemas';

/**
 * Exit Resolver
 *
 * Handles complex exit navigation and resolution.
 */
export class ExitResolver {
  /**
   * Resolve a movement command to a specific destination.
   */
  static resolveExit(map: LocationMap, locationId: string, command: string) {
    return LocationService.resolveDirection(map, locationId, command);
  }
}
