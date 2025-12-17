// Location submodule barrel

// Legacy/existing location types
export * from './building.js';
export * from './region.js';
export * from './room.js';
export * from './builtLocation.js';
export * from './locationMap.js';

// V2 location types - explicit exports to avoid conflicts with locationMap
// Note: LocationType and LocationTypeSchema already come from locationMap.js
// We export LocationSchema as LocationV2Schema to avoid confusion
export {
  // Location definitions (V2 format)
  LocationSchema as LocationV2Schema,
  type Location as LocationV2,
  CreateLocationSchema,
  type CreateLocation,
  UpdateLocationSchema,
  type UpdateLocation,
  // Location ports/exits (V2 with target references)
  ExitDirectionSchema,
  type ExitDirection,
  LocationPortSchema as LocationPortV2Schema,
  type LocationPort as LocationPortV2,
  // Prefab instances
  PrefabLocationInstanceSchema,
  type PrefabLocationInstance,
  // Connections
  ConnectionDirectionSchema,
  type ConnectionDirection,
  PrefabConnectionSchema,
  type PrefabConnection,
  // Entry points
  PrefabEntryPointSchema,
  type PrefabEntryPoint,
  // Full prefab
  LocationPrefabV2Schema,
  type LocationPrefabV2,
  CreatePrefabV2Schema,
  type CreatePrefabV2,
  // Canvas types
  CanvasNodeTypeSchema,
  type CanvasNodeType,
  CanvasNodeSchema,
  type CanvasNode,
} from './locationV2.js';
