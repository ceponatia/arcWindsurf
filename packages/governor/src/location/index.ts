/**
 * Location module - location graph operations for navigation and pathfinding.
 * Re-exports from @minimal-rpg/services for backwards compatibility.
 */

export {
  LocationService as LocationGraphService,
  type LocationInfo,
  type ResolvedExit,
  type PathResult,
  type DirectionResolution,
  type ReachabilityResult,
} from '@minimal-rpg/services';
